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

export class StringUtil {
  public static isNullUndefinedOrWhitespace(value: string | undefined | null): boolean {
    if (typeof value === void 0 || value == null) {
      return true;
    }
    return `${value}`.replace(/\s/g, '').length < 1;
  }

  public static isNonEmpty(value: string | undefined | null): boolean {
    return !StringUtil.isNullUndefinedOrWhitespace(value);
  }

  public static endsWith(value: string, suffix: string): boolean {
    if (!StringUtil.isNullUndefinedOrWhitespace(value) && !StringUtil.isNullUndefinedOrWhitespace(suffix)) {
      return value.indexOf(suffix, value.length - suffix.length) !== -1;
    } else {
      return false;
    }
  }

  public static toMixedCase(value: string): string {
    return value
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => {
        return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
      })
      .join(' ');
  }

  public static replaceWhitespace(searchValue: string, replaceValue: string): string {
    return searchValue
      ? searchValue
          .trim()
          .replace(/([\n ]*,[\n ]*|[\n ]+)/g, replaceValue)
          .replace(new RegExp(`${replaceValue}$`), '')
      : searchValue;
  }

  public static whitespacesToCommas(searchValue: string): string {
    return StringUtil.replaceWhitespace(searchValue, ',');
  }

  public static tokenizeWhitespaceSeparated(value: string): string[] | undefined {
    return value ? StringUtil.replaceWhitespace(value, ' ').split(' ') : void 0;
  }
}
