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
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {ExceptionModalComponent} from './exception-modal.component';
import {Exception} from '../../../core/exception/exception.model';
import {InfoModalComponent} from './info-modal.component';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private _modalRef?: NgbModalRef;
  private _exceptionModalRef?: NgbModalRef;

  constructor(private ngbModal: NgbModal) {}

  open(modal: any): NgbModalRef | undefined {
    if (!this._modalRef) {
      this._modalRef = this.ngbModal.open(modal, {
        fullscreen: 'md',
      });
    }

    this._modalRef.dismissed.subscribe({
      next: () => {
        this._modalRef = undefined;
      },
    });

    return this._modalRef;
  }

  exception(exception: Exception) {
    if (!this._exceptionModalRef) {
      this._exceptionModalRef = this.ngbModal.open(ExceptionModalComponent, {
        fullscreen: 'md',
        modalDialogClass: 'exception-modal',
      });
    }

    this._exceptionModalRef.dismissed.subscribe({
      next: () => {
        this._exceptionModalRef = undefined;
      },
    });

    (this._exceptionModalRef.componentInstance as ExceptionModalComponent).addException(exception);
  }

  info(message: string): NgbModalRef {
    let modalRef = this.ngbModal.open(InfoModalComponent, {
      fullscreen: 'md',
      modalDialogClass: 'info-modal',
    });

    (modalRef.componentInstance as InfoModalComponent).addMessage(message);

    return modalRef;
  }
}
