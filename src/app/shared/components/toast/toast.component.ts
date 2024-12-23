import {Component, inject, Input} from '@angular/core';
import {NgbToast} from '@ng-bootstrap/ng-bootstrap';
import {ToastService} from './toast.service';
import {NgClass} from '@angular/common';
import {IconModule} from '../icon/icon.module';
import {IconName} from '../icon/icon.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgbToast, NgClass, IconModule],
  template: `
    <ngb-toast class="toast" [ngClass]="typeToClass[toast.type]" [autohide]="toast.duration !== undefined" [delay]="toast.duration ?? 0" (hidden)="toastService.remove(toast)">
      <div class="toast-content">
        <i [appIcon]="typeToIcon[toast.type]"></i>
        <span>{{ toast.message }}</span>
      </div>
      <div class="toast-close-container" (click)="toastService.remove(toast)"><i appIcon="close"></i></div>
    </ngb-toast>
  `,
})
export class ToastComponent {
  @Input() toast!: Toast;

  toastService = inject(ToastService);
  typeToClass: Record<ToastType, string> = {
    'success': 'toast-success',
    'warning': 'toast-warning',
    'error': 'toast-error',
  };
  typeToIcon: Record<ToastType, IconName> = {
    'success': 'toast-success',
    'error': 'toast-error',
    'warning': 'toast-warning',
  };
}

export type ToastType = 'success' | 'warning' | 'error';

export interface Toast {
  message: string;
  type: ToastType;
  duration?: number;
}
