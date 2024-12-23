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

import {Component, EventEmitter, Input, Output} from '@angular/core';
import {BaseModal} from '../modal/base-modal';

import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [],
  template: `
    <div class="custom-modal">
      <div class="modal-header">
        @if (headerText) {
          <span> {{ headerText }} </span>
        }
      </div>
      <div class="modal-body">
        @if (confirmationMessage) {
          <p>
            {{ confirmationMessage }}
          </p>
        }
      </div>
      <div class="modal-footer">
        <div class="d-flex btn-group">
          <button type="button" class="btn action-button" (click)="onOkAction()">{{ confirmText }}</button>
          <button type="button" class="btn close-button" (click)="activeModal.dismiss()">{{ cancelText }}</button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmationModalComponent {
  @Input()
  confirmationMessage?: string;
  @Input()
  headerText?: string;
  @Input()
  confirmText = 'Ok';
  @Input()
  cancelText = 'Cancel';
  @Output()
  onOk$: EventEmitter<any> = new EventEmitter<any>();

  onOkAction() {
    this.onOk$.emit();
    this.activeModal.dismiss();
  }

  constructor(public activeModal: NgbActiveModal) {}
}
