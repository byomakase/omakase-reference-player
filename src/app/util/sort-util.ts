/*
 * Copyright 2024 ByOmakase, LLC (https://byomakase.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/***
 * Modified version of https://github.com/studio-b12/natural-sort/blob/3540ff115ebb9b44b30429db459346aa3c2cd2bd/index.js
 */
export function naturalSort<T>(options: { desc?: boolean, caseSensitive?: boolean } = {desc: false, caseSensitive: false}) {
  if (!options) {
    options = {};
  }

  return function (a: T, b: T) {
    const equal = 0;
    const greater = options.desc ? -1 : 1;
    const smaller = -greater;

    const re = /(^-?[0-9]+(\.?[0-9]*)[df]?e?[0-9]?$|^0x[0-9a-f]+$|[0-9]+)/gi;
    const sre = /(^[ ]*|[ ]*$)/g;
    const dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/;
    const hre = /^0x[0-9a-f]+$/i;
    const ore = /^0/;

    const normalizeFn = (value: T) => {
      const normalizedValue = '' + value;
      return options.caseSensitive ? normalizedValue : normalizedValue.toLowerCase();
    };

    // Normalize values to strings
    const x = normalizeFn(a).replace(sre, '') || '';
    const y = normalizeFn(b).replace(sre, '') || '';

    // chunk/tokenize
    const xN = x.replace(re, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0');
    const yN = y.replace(re, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0');

    // Return immediately if at least one of the values is empty.
    if (!x && !y) {
      return equal;
    }
    if (!x && y) {
      return greater;
    }
    if (x && !y) {
      return smaller;
    }

    // numeric, hex or date detection

    const xD = parseInt((x as any).match(hre), 16) || (xN.length !== 1 && Date.parse(x));
    const yD = parseInt((y as any).match(hre), 16) || xD && y.match(dre) && Date.parse(y) || null;
    let oFxNcL: any;
    let oFyNcL: any;

    // first try and sort Hex codes or Dates
    if (yD) {
      // @ts-ignore
      if (xD < yD) {
        return smaller;
      } else { // @ts-ignore
        if (xD > yD) {
                return greater;
              } else {

              }
      }
    }

    // natural sorting through split numeric strings and default strings
    for (let cLoc = 0, numS = Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {

      // find floats not starting with '0', string or 0 if not defined (Clint Priest)
      oFxNcL = !(xN[cLoc] || '').match(ore) && parseFloat(xN[cLoc]) || xN[cLoc] || 0;
      oFyNcL = !(yN[cLoc] || '').match(ore) && parseFloat(yN[cLoc]) || yN[cLoc] || 0;

      // handle numeric vs string comparison - number < string - (Kyle Adams)
      if (isNaN(oFxNcL) !== isNaN(oFyNcL)) {
        return (isNaN(oFxNcL)) ? greater : smaller;
      } else if (typeof oFxNcL !== typeof oFyNcL) { // rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
        oFxNcL += '';
        oFyNcL += '';
      } else {

      }

      if (oFxNcL < oFyNcL) {
        return smaller;
      }

      if (oFxNcL > oFyNcL) {
        return greater;
      }
    }

    return equal;
  };
}
