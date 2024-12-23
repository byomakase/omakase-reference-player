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

import {HttpParams} from '@angular/common/http';

export interface HttpParamsConvertable {
  toHttpParams(): HttpParams;
}

export interface HttpParamConvertable {
  getHttpParamName(): string;

  getHttpParamValue(): string;
}

export class HttpParamsBuilder {
  protected httpParams = new HttpParams();

  protected constructor() {}

  public static create(): HttpParamsBuilder {
    return new HttpParamsBuilder();
  }

  public append(httpParams: HttpParams): HttpParamsBuilder {
    if (httpParams && httpParams.keys().length > 0) {
      for (const key of httpParams.keys()) {
        let pairs = httpParams.getAll(key);
        if (pairs) {
          for (const value of pairs) {
            this.httpParams = this.httpParams.append(key, value);
          }
        }
      }
    }
    return this;
  }

  public build(): HttpParams {
    return this.httpParams;
  }
}
