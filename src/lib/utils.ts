export function addrShort(addr: string, size?: number) {
  const cropSize = size ?? 3;
  return `${addr.substring(0, cropSize)}...${addr.substring(
    addr.length - cropSize,
    addr.length,
  )}`;
}
