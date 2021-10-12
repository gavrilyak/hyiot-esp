export default function to7Bits(buff) {
  for(let i=0, arr = new Uint8Array(buff), l=arr.length; i<l;i++) arr[i]&=0x7F;
  return buff;
}


