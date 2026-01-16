import {Component, Input, ViewChild} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {IconModule} from '../../../shared/components/icon/icon.module';
import {SharedModule} from '../../../shared/shared.module';
import {SessionData} from '../../../model/domain.model';
import {StringUtil} from '../../../util/string-util';
import {NgbDropdown} from '@ng-bootstrap/ng-bootstrap';

interface StatusItem {
  action: string;
  status: string;
  color: string;
  open: boolean;
}

@Component({
    selector: 'div[appStatus]',
    imports: [CoreModule, SharedModule, IconModule],
    template: `
    <div id="status">
      <div class="status-btn-group" ngbDropdown role="group" #dropdown="ngbDropdown" [class.d-none]="!isStatusVisible" [class.read-only]="!approval" [class]="statusColor">
        <button type="button" class="btn btn-primary btn-status" ngbDropdownToggle [disabled]="!approval">
          <div class="status d-flex align-items-center">
            <i appIcon="status" [class]="statusColor"></i>
            <a [class]="statusColor">{{ status }}</a>
          </div>
          @if (approval) {
            <i appIcon="arrow-down-light" [class]="statusColor" [class.rotate]="isDropdownOpen()"></i>
          }
        </button>
        <div class="status-menu" ngbDropdownMenu>
          @for (statusItem of statusItems; track statusItem) {
            <button
              type="button"
              class="d-flex justify-content-between btn status-item"
              [class]="statusItemColor(statusItem.action)"
              [class.d-none]="isStatusPresented(statusItem.action)"
              (click)="onDropdownItemClick(statusItem.action)"
            >
              {{ statusItem.action }}
              <i appIcon="arrow-down-light" [class.rotate]="isConfirmationOpen(statusItem.action)"></i>
            </button>
            <div class="d-flex confirm-window" [class.d-none]="!isConfirmationOpen(statusItem.action)">
              <button type="button" class="confirm-btn" (click)="onConfirmClick(statusItem.action)">CONFIRM</button>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class StatusComponent {
  @ViewChild('dropdown') ngbDropdown?: NgbDropdown;

  private _sessionData?: SessionData;

  private _statusColor: string = 'white';
  private _status?: string;
  private _approval: boolean = false;
  statusItems: Array<StatusItem> = [
    {action: 'Accept', status: 'accepted', color: 'green', open: false},
    {action: 'Reject', status: 'rejected', color: 'red', open: false},
    {action: 'Hold', status: 'hold', color: 'yellow', open: false},
    {action: 'Review', status: 'reviewing', color: 'blue', open: false},
  ];

  @Input()
  set sessionData(value: SessionData | undefined) {
    this._sessionData = value;

    if (this._sessionData?.session?.status) {
      this._status = this._sessionData?.session?.status;
      this.findStatusColor();
    } else {
      this._status = undefined;
    }

    if (this._sessionData?.presentation?.layout?.approval) {
      this._approval = true;

      if (!this.statusItems.find((statusItem) => statusItem.status === this._status)) {
        this._status = 'STATUS';
      }
    } else {
      this._approval = false;
    }
  }

  private findStatusColor() {
    this._statusColor = this.statusItems.find((statusItem) => statusItem.status === this._status) ? this.statusItems.find((statusItem) => statusItem.status === this._status)!.color : 'white';
  }

  private resetConfirmationOpen() {
    this.statusItems.forEach((statusItem) => {
      statusItem.open = false;
    });
  }

  onDropdownItemClick(statusAction: string) {
    this.statusItems.forEach((statusItem) => {
      if (statusItem.action === statusAction) {
        statusItem.open = !statusItem.open;
      } else {
        statusItem.open = false;
      }
    });
  }

  isDropdownOpen(): boolean {
    if (this.ngbDropdown?.isOpen()) {
      return true;
    } else {
      this.resetConfirmationOpen();

      return false;
    }
  }

  isConfirmationOpen(statusAction: string): boolean {
    return this.statusItems.find((statusItem) => statusItem.action === statusAction)!.open;
  }

  isStatusPresented(statusAction: string) {
    return this._status === this.statusItems.find((statusItem) => statusItem.action === statusAction)!.status;
  }

  onConfirmClick(statusAction: string) {
    this._status = this.statusItems.find((statusItem) => statusItem.action === statusAction)!.status;
    this.findStatusColor();

    this.resetConfirmationOpen();

    this.ngbDropdown?.close();
  }

  statusItemColor(statusItemAction: string): string {
    return this.statusItems.find((statusItem) => statusItem.action === statusItemAction)!.color;
  }

  get approval(): boolean {
    return this._approval;
  }

  get status(): string {
    let formatedStatus;
    if (this._status && this._status !== 'STATUS') {
      formatedStatus = StringUtil.toMixedCase(this._status);
    } else {
      formatedStatus = this._status || '';
    }

    return formatedStatus;
  }

  get statusColor(): string {
    return this._statusColor;
  }

  get isStatusVisible(): boolean {
    return this._status || this._approval ? true : false;
  }
}
