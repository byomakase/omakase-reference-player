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

export class FileUtil {

  static extractFilename(path: string): string | undefined {
    const parts = path.split('/');
    return parts[parts.length - 1];
  }

  static extractFileExtension(path: string): string | undefined {
    const parts = path.split('.');
    if (parts.length > 1) {
      return parts.pop() || void 0; // Return the last part after splitting by dots
    }
    return void 0;
  }


}
