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

import {Directive, OnDestroy} from '@angular/core';
import {Subject} from 'rxjs';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';

@Directive()
export abstract class BaseModal implements OnDestroy {
  /***
   * cleaning observers so no subscriptions keep hanging
   * @protected
   */
  protected onDestroy$ = new Subject<void>();

  protected constructor(public activeModal: NgbActiveModal) {
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  get canDismiss(): boolean {
    return true;
  }

  dismiss(reason?: any) {
    this.activeModal.dismiss(reason);
  }
}
