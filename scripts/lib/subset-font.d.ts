/** subset-font 2.x ships no type declarations; this covers the options we use. */
declare module 'subset-font' {
  interface SubsetFontOptions {
    targetFormat?: 'sfnt' | 'woff' | 'woff2'
    /** Pin variable axes to instance a static face, e.g. `{ wght: 700 }`. */
    variationAxes?: Record<string, number | { min: number; max: number }>
    preserveNameIds?: number[]
  }
  export default function subsetFont(
    font: Uint8Array,
    text: string,
    options?: SubsetFontOptions
  ): Promise<Uint8Array>
}
