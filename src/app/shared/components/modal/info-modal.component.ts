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

import {Component} from '@angular/core';
import {BaseModal} from './base-modal';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-info-modal',
  standalone: true,
  imports: [],
  template: `
    <div class="modal-header">
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <div class="robot-title">
        <img [src]="'assets/images/info-robot.svg'" alt="Error" />

        <div class="d-flex justify-content-center">
          <h4>Info</h4>
        </div>
      </div>

      @for (message of messages; track $index) {
        <div>{{ message }}</div>
      }
    </div>
    <div class="modal-footer">
      <!--      <button type="button" class="btn btn-primary" (click)="activeModal.close()">Close</button>-->
    </div>
  `,
})
export class InfoModalComponent extends BaseModal {
  messages: string[] = [];

  constructor(activeModal: NgbActiveModal) {
    super(activeModal);
  }

  addMessage(message: string) {
    if (!this.messages.find((e) => e === message)) {
      this.messages.push(message);
    }
  }
}
