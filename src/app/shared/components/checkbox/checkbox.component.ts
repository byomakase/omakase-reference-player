import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IconModule} from '../icon/icon.module';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [IconModule, CommonModule],
  template: `<div class="app-checkbox" (click)="!isDisabled && toggleChecked()" [ngClass]="{disabled: isDisabled}">
    @if (isChecked) {
      <i class="icon-checked" appIcon="checkbox-checked"></i>
    } @else {
      <i class="icon-unchecked" appIcon="checkbox-unchecked"></i>
    }
    {{ label }}
  </div>`,
})
export class CheckboxComponent {
  @Input() isChecked!: boolean;
  @Input() isDisabled = false;
  @Input() label!: string;

  @Output() onChecked: EventEmitter<boolean> = new EventEmitter();

  toggleChecked() {
    this.onChecked.emit(!this.isChecked);
  }
}
