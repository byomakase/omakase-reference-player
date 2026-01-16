import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap';
import {IconModule} from '../icon/icon.module';

export interface DropdownOption<T> {
  label: string;
  value: T;
}

@Component({
    selector: 'app-dropdown',
    imports: [NgbDropdownModule, CommonModule, IconModule],
    template: `<div class="app-dropdown btn-group btn-group-manifest" ngbDropdown role="group" [placement]="'bottom-start'" [ngClass]="{small: isSmall}">
    <button type="button" class="btn btn-primary btn-manifest" ngbDropdownToggle>
      <div class="dropdown-toggle-text">{{ getSelectedLabel() }}</div>
      <i appIcon="chevron-down"></i>
    </button>
    <div class="dropdown-menu" ngbDropdownMenu>
      @for (option of options; track option.value) {
        <button ngbDropdownItem (click)="selectOption(option)" [class.active]="option.value === selectedOption" [disabled]="isDisabled">
          {{ option.label }}
        </button>
      }
    </div>
  </div>`
})
export class DropdownComponent<T> {
  @Input() options?: DropdownOption<T>[] | null;
  @Input() selectedOption?: any;
  @Input() isDisabled: boolean = false;
  @Input() isSmall: boolean = false;

  @Output() onSelected: EventEmitter<DropdownOption<T>> = new EventEmitter();

  selectOption(option: DropdownOption<T>) {
    this.onSelected.emit(option);
  }

  getSelectedLabel(): string {
    return this.options?.find((option) => option.value === this.selectedOption)?.label ?? '';
  }
}
