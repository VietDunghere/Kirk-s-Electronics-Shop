"""Copy the app's demo data into the eight-table VP diagram schema.

Run after adding products to prisma/dev.db. This never alters the app database.
Existing VP rows are retained; matching IDs are skipped on subsequent runs.
"""

from pathlib import Path
import sqlite3


directory = Path(__file__).resolve().parent
source_path = directory / "dev.db"
target_path = directory / "vp_catalog.db"
schema_path = directory / "vp_schema.sql"

if not source_path.is_file():
    raise SystemExit("Missing prisma/dev.db. Run Prisma migration and seed first.")

connection = sqlite3.connect(target_path)
try:
    connection.executescript(schema_path.read_text(encoding="utf-8"))
    connection.execute("ATTACH DATABASE ? AS app", (str(source_path),))
    with connection:
        connection.execute("""
            INSERT OR IGNORE INTO Customer (CustomerID, Name, Email, Password)
            SELECT CAST(id AS TEXT), fullName, email, passwordHash FROM app.User
        """)
        connection.execute("""
            INSERT OR IGNORE INTO Product (ProductID, Name, Description, Price, StockQuantity)
            SELECT CAST(id AS TEXT), name, description, price, stock FROM app.Product
        """)
        connection.execute("""
            INSERT OR IGNORE INTO Cart (CartID, CustomerCustomerID, TotalAmount)
            SELECT CAST(c.id AS TEXT), CAST(c.userId AS TEXT),
                   CAST(COALESCE((SELECT SUM(ci.quantity * p.price)
                                  FROM app.CartItem ci JOIN app.Product p ON p.id = ci.productId
                                  WHERE ci.cartId = c.id), 0) AS INTEGER)
            FROM app.Cart c
        """)
        connection.execute("""
            INSERT OR IGNORE INTO CartItem
                (ProductID, CartCartID, ProductProductID, Quantity, UnitPrice)
            SELECT CAST(ci.id AS TEXT), CAST(ci.cartId AS TEXT),
                   CAST(ci.productId AS TEXT), ci.quantity, p.price
            FROM app.CartItem ci JOIN app.Product p ON p.id = ci.productId
        """)
        connection.execute("""
            INSERT OR IGNORE INTO "Order"
                (OrderID, CustomerCustomerID, OrderDate, TotalAmount, Status)
            SELECT CAST(id AS TEXT), CAST(userId AS TEXT),
                   date(createdAt / 1000, 'unixepoch'), totalAmount, orderStatus
            FROM app."Order"
        """)
        connection.execute("""
            INSERT OR IGNORE INTO OrderItem
                (ProductID, OrderOrderID, ProductProductID, Quantity, UnitPrice)
            SELECT CAST(id AS TEXT), CAST(orderId AS TEXT), CAST(productId AS TEXT),
                   quantity, price FROM app.OrderItem
        """)
        connection.execute("""
            INSERT OR IGNORE INTO Shipping (ShippingID, OrderOrderID, Address, Status)
            SELECT CAST(id AS TEXT), CAST(id AS TEXT),
                   shippingAddress || ', ' || ward || ', ' || district || ', ' || city,
                   orderStatus FROM app."Order"
        """)
        # Payment details are intentionally blank: the app only simulates payment
        # and never keeps card numbers or CVVs.
        connection.execute("""
            INSERT OR IGNORE INTO Payment
                (PaymentID, OrderOrderID, Amount, Status, CardNumber,
                 CardHolderName, ExpDate, Cvv, WalletId, Discriminator)
            SELECT CAST(id AS TEXT), CAST(id AS TEXT), totalAmount,
                   paymentStatus, '', '', NULL, '', '', paymentMethod
            FROM app."Order"
        """)

    violations = connection.execute("PRAGMA foreign_key_check").fetchall()
    if violations:
        raise RuntimeError(f"Foreign key violations: {violations}")
    for table in ("Customer", "Product", "Cart", "CartItem", "Order", "OrderItem", "Shipping", "Payment"):
        count = connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        print(f"{table}: {count}")
    print(f"VP database: {target_path}")
finally:
    connection.close()
