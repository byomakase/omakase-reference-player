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

import {ErrorHandler, Injectable} from '@angular/core';
import {Store} from '@ngxs/store';
import {AppActions} from '../state/app.actions';
import {StringUtil} from '../../util/string-util';
import {serializeError} from 'serialize-error';
import ShowExceptionModal = AppActions.ShowExceptionModal;

@Injectable({
  providedIn: 'root'
})
export class CustomErrorHandler implements ErrorHandler {

  constructor(protected store: Store) {

  }

  handleError(error: any): void {
    console.error(error);

    this.store.dispatch(new ShowExceptionModal({
      message: error && StringUtil.isNonEmpty(error.message) ? error.message : serializeError(error, {maxDepth: 10})
    }))
  }
}
