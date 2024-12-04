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

import {Injectable} from '@angular/core';
import {Actions, ofActionSuccessful} from '@ngxs/store';
import {AppActions} from './shared/state/app.actions';
import {ModalService} from './shared/components/modal/modal.service';
import {OmpApiService} from './shared/components/omakase-player/omp-api.service';
import {map, Observable, of, take, timeout} from 'rxjs';
import ShowExceptionModal = AppActions.ShowExceptionModal;
import ShowInfoModal = AppActions.ShowInfoModal;

@Injectable({
  providedIn: 'root',
})
export class AppEffectsService {
  constructor(
    private actions$: Actions,
    private modalService: ModalService,
    protected ompApiService: OmpApiService
  ) {
    this.actions$.pipe(ofActionSuccessful(ShowExceptionModal)).subscribe((action) => {
      this.modalService.exception(action.exception);
    });

    this.actions$.pipe(ofActionSuccessful(ShowInfoModal)).subscribe((action) => {
      let modalRef = this.modalService.info(action.message);

      if (action.autoclose) {
        let closeOn$: Observable<boolean>;
        switch (action.autoclose) {
          case 'play':
            closeOn$ = this.ompApiService.api!.video.onPlay$.pipe(map((p) => true));
            break;
          case 'fullscreen':
            closeOn$ = this.ompApiService.api!.video.onFullscreenChange$.pipe(map((p) => true));
            break;
          default:
            closeOn$ = of(true);
            break;
        }

        closeOn$.pipe(take(1), timeout(60000)).subscribe({
          next: () => {
            if (modalRef) {
              try {
                modalRef.close();
              } catch (e) {
                // ignore
              }
            }
          },
          error: () => {
            // ignore
          },
        });
      }
    });
  }
}
