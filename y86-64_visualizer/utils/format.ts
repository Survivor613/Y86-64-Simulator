export const toHex = (val: number, padding: number = 16): string => {
  if (val === undefined || val === null) return '0'.repeat(padding);
  
  // Handle negative numbers for 64-bit display logic if needed, 
  // but usually simulator returns unsigned or we cast to unsigned.
  // JavaScript bitwise operators allow simulating 64-bit behavior via BigInt if needed.
  // For visual simplicity, we assume the input is a valid number.
  
  let hex = Math.abs(val).toString(16).toUpperCase();
  return "0x" + hex.padStart(padding, '0');
};

export const toAddressHex = (val: number): string => {
  return "0x" + val.toString(16).toUpperCase().padStart(3, '0');
};

export const formatByte = (val: number): string => {
  return val.toString(16).toUpperCase().padStart(2, '0');
};