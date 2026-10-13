-- Physical schema transcribed from VP/Screenshot 2026-10-13 102115.png.
-- Names and declared column types match the eight tables in the diagram.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Customer (
  CustomerID varchar(255) NOT NULL PRIMARY KEY,
  Name varchar(255) NOT NULL,
  Email varchar(255) NOT NULL,
  Password varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Product (
  ProductID varchar(255) NOT NULL PRIMARY KEY,
  Name varchar(255) NOT NULL,
  Description varchar(255) NOT NULL,
  Price double(10) NOT NULL,
  StockQuantity integer(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS Cart (
  CartID varchar(255) NOT NULL PRIMARY KEY,
  CustomerCustomerID varchar(255) NOT NULL,
  TotalAmount integer(10) NOT NULL,
  FOREIGN KEY (CustomerCustomerID) REFERENCES Customer(CustomerID)
);

CREATE TABLE IF NOT EXISTS CartItem (
  ProductID varchar(255) NOT NULL PRIMARY KEY,
  CartCartID varchar(255) NOT NULL,
  ProductProductID varchar(255) NOT NULL,
  Quantity integer(10) NOT NULL,
  UnitPrice double(10) NOT NULL,
  FOREIGN KEY (CartCartID) REFERENCES Cart(CartID),
  FOREIGN KEY (ProductProductID) REFERENCES Product(ProductID)
);

CREATE TABLE IF NOT EXISTS "Order" (
  OrderID varchar(255) NOT NULL PRIMARY KEY,
  CustomerCustomerID varchar(255) NOT NULL,
  OrderDate date NOT NULL,
  TotalAmount double(10) NOT NULL,
  Status varchar(255) NOT NULL,
  FOREIGN KEY (CustomerCustomerID) REFERENCES Customer(CustomerID)
);

CREATE TABLE IF NOT EXISTS OrderItem (
  ProductID varchar(255) NOT NULL PRIMARY KEY,
  OrderOrderID varchar(255) NOT NULL,
  ProductProductID varchar(255) NOT NULL,
  Quantity integer(10) NOT NULL,
  UnitPrice double(10) NOT NULL,
  FOREIGN KEY (OrderOrderID) REFERENCES "Order"(OrderID),
  FOREIGN KEY (ProductProductID) REFERENCES Product(ProductID)
);

CREATE TABLE IF NOT EXISTS Shipping (
  ShippingID varchar(255) NOT NULL PRIMARY KEY,
  OrderOrderID varchar(255) NOT NULL,
  Address varchar(255) NOT NULL,
  Status varchar(255) NOT NULL,
  FOREIGN KEY (OrderOrderID) REFERENCES "Order"(OrderID)
);

CREATE TABLE IF NOT EXISTS Payment (
  PaymentID varchar(255) NOT NULL PRIMARY KEY,
  OrderOrderID varchar(255) NOT NULL,
  Amount double(10) NOT NULL,
  Status varchar(255) NOT NULL,
  CardNumber varchar(255) NOT NULL DEFAULT '',
  CardHolderName varchar(255) NOT NULL DEFAULT '',
  ExpDate date,
  Cvv varchar(255) NOT NULL DEFAULT '',
  WalletId varchar(255) NOT NULL DEFAULT '',
  Discriminator varchar(255) NOT NULL,
  FOREIGN KEY (OrderOrderID) REFERENCES "Order"(OrderID)
);
