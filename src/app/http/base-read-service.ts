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

import {BaseHttpService} from './base-http-service';
import {HttpClient, HttpParams} from '@angular/common/http';

export interface ServiceFilter {}

export abstract class BaseReadService<T, ID, F extends ServiceFilter> extends BaseHttpService {
  protected constructor(http: HttpClient, rootUrl: string) {
    super(http, rootUrl);
  }

  /***
   * Override with filter specific implementation
   * @param filter
   * @protected
   */
  protected filterToHttpParams(filter: F | undefined): HttpParams {
    return new HttpParams();
  }
}
