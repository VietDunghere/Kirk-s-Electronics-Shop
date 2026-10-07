"use client";
import { useState } from "react";
import type { ShippingInfo } from "@/lib/types";

const PROVINCE_EXAMPLE = ["Ha Noi", "Ho Chi Minh City", "Da Nang", "Hai Phong", "Can Tho"];

export default function ShippingForm({
  initial,
  onValidChange,
  onChange
}: {
  initial: ShippingInfo;
  onValidChange?: (valid: boolean) => void;
  onChange?: (v: ShippingInfo) => void;
}) {
  const [form, setForm] = useState<ShippingInfo>(initial);
  const [touched, setTouched] = useState(false);

  const errors: Record<string, string> = {};
  if (!form.fullName.trim()) errors.fullName = "Full name is required.";
  if (!form.phone.trim()) errors.phone = "Phone number is required.";
  else if (!/^[0-9+ ]{9,15}$/.test(form.phone.trim())) errors.phone = "Invalid phone number.";
  if (!form.address.trim()) errors.address = "Address is required.";
  if (!form.city.trim()) errors.city = "City/Province is required.";
  if (!form.district.trim()) errors.district = "District is required.";
  if (!form.ward.trim()) errors.ward = "Ward is required.";

  const valid = Object.keys(errors).length === 0;

  const set = (k: keyof ShippingInfo, v: string) => {
    const next = { ...form, [k]: v };
    setForm(next);
    onChange?.(next);
    const hasErr =
      !next.fullName.trim() || !next.phone.trim() || !next.address.trim() ||
      !next.city.trim() || !next.district.trim() || !next.ward.trim();
    onValidChange?.(!hasErr);
  };

  const field = (label: string, key: keyof ShippingInfo, placeholder: string, opts?: { list?: string[] }) => (
    <div>
      <label className="mb-1 block text-sm font-medium">{label} *</label>
      <input
        list={opts?.list ? `${key}-list` : undefined}
        value={form[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#B31942] ${touched && errors[key] ? "border-red-500" : "border-gray-300"}`}
      />
      {opts?.list && (
        <datalist id={`${key}-list`}>
          {opts.list.map((o) => <option key={o} value={o} />)}
        </datalist>
      )}
      {touched && errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="space-y-3" onBlur={() => setTouched(true)}>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("Full name", "fullName", "Nguyen Van A")}
        {field("Phone number", "phone", "0901234567")}
      </div>
      {field("Address", "address", "123 Nguyen Trai Street")}
      <div className="grid gap-3 sm:grid-cols-3">
        {field("City / Province", "city", "Ha Noi", { list: PROVINCE_EXAMPLE })}
        {field("District", "district", "Thanh Xuan")}
        {field("Ward", "ward", "Nhan Chinh")}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Note (optional)</label>
        <textarea
          value={form.note ?? ""}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Delivery note, e.g. call before arrival"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#B31942]"
          rows={2}
        />
      </div>
    </div>
  );
}
