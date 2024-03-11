/**
 * Pad a number
 * @assumes whole number
 * @param num number to pad
 * @param places Full number of places to pad with 0's
 * @returns padded string
 */
export function padNumber (num: number, places: number): string {
  let strNum = num.toString()
  for (let i = strNum.length; i < places; ++i) {
    strNum = `0${strNum}`
  }
  return strNum
}
