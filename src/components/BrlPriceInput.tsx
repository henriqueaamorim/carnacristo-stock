"use client";

import { useCallback, useState } from "react";
import {
  amountToApiPrice,
  digitsToAmount,
  formatDigitsToBrl,
} from "@/utils/currency";

const MAX_DIGITS = 11; // até R$ 99.999.999,99

type BrlPriceInputProps = {
  name?: string;
  defaultValue?: number;
  required?: boolean;
  className?: string;
  placeholder?: string;
};

export function BrlPriceInput({
  name = "price",
  defaultValue,
  required = false,
  className,
  placeholder = "R$ 0,00",
}: BrlPriceInputProps) {
  const [digits, setDigits] = useState(() => {
    if (defaultValue == null || defaultValue <= 0) return "";
    const cents = Math.round(defaultValue * 100);
    return String(cents);
  });

  const display = digits ? formatDigitsToBrl(digits) : "";
  const amount = digitsToAmount(digits);
  const apiValue =
    amount != null && amount > 0 ? amountToApiPrice(amount) : "";

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
    setDigits(next);
  }, []);

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={onChange}
        required={required && !apiValue}
        placeholder={placeholder}
        aria-label="Preço em reais"
        className={className}
      />
      <input type="hidden" name={name} value={apiValue} />
    </>
  );
}
