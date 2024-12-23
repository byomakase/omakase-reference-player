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

import {ErrorHandler, inject, Injectable} from '@angular/core';
import {Store} from '@ngxs/store';
import {AppActions} from '../state/app.actions';
import {StringUtil} from '../../util/string-util';
import {serializeError} from 'serialize-error';
import {OmpApiService} from '../components/omakase-player/omp-api.service';
import ShowInfoModal = AppActions.ShowInfoModal;
import ShowExceptionModal = AppActions.ShowExceptionModal;

@Injectable({
  providedIn: 'root',
})
export class CustomErrorHandler implements ErrorHandler {
  constructor(
    protected store: Store,
    protected ompApiService: OmpApiService
  ) {
    this.ompApiService = inject(OmpApiService);
  }

  handleError(error: any): void {
    if (error.name === 'OmpBroadcastChannelTimeoutError') {
      console.debug(error);
    } else if ((error.name === 'TypeError' || error.name === 'NotAllowedError') && this.ompApiService.api?.video.getVideoWindowPlaybackState() === 'detached') {
      this.store.dispatch(new ShowInfoModal(`Please initate action in detached player window`));
    } else if (error.name === 'OmpVideoWindowPlaybackError' && this.ompApiService.api?.video.getVideoWindowPlaybackState() === 'detached') {
      if (error.message === 'play') {
        this.store.dispatch(new ShowInfoModal(`Please initate playback in detached player window`, 'play'));
      } else if (error.message === 'toggleFullscreen') {
        this.store.dispatch(new ShowInfoModal(`Please initate toggle fullscreen in detached player window`, 'fullscreen'));
      } else {
        this.store.dispatch(new ShowInfoModal(`Please initate action in detached player window`));
      }
    } else {
      console.error(error);
      this.store.dispatch(
        new ShowExceptionModal({
          message: error && StringUtil.isNonEmpty(error.message) ? error.message : serializeError(error, {maxDepth: 10}),
        })
      );
    }
  }
}
