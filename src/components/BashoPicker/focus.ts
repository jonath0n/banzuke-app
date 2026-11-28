export type PickerControl = 'previous' | 'next' | 'current'

/**
 * Where focus goes after a step: the same control on the new sheet's picker (found by
 * its `data-basho`, so the old picker never matches), else that picker's label, for a
 * control the new sheet does not have (› to the live sheet, "Current banzuke").
 */
export function pickerFocusSelectors(bashoId: number | null, control: PickerControl): string[] {
  const nav = `nav[data-basho="${bashoId ?? 'live'}"]`
  return [`${nav} [data-picker="${control}"]`, `${nav} [data-picker="label"]`]
}
