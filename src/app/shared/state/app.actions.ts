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

import {Exception} from '../../core/exception/exception.model';

export namespace AppActions {
  export class ShowExceptionModal {
    static readonly type = '[Modal] Show exception modal';

    constructor(public exception: Exception) {}
  }

  export class ShowInfoModal {
    static readonly type = '[Modal] Show info modal';

    constructor(
      public message: string,
      public autoclose?: 'play' | 'fullscreen'
    ) {}
  }
}
