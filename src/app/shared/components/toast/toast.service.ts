import {Injectable} from '@angular/core';
import {Toast} from './toast.component';

@Injectable({providedIn: 'root'})
export class ToastService {
  toasts: Toast[] = [];
  constructor() {}

  show(toast: Toast) {
    this.toasts.push(toast);
  }

  remove(toast: Toast) {
    this.toasts = this.toasts.filter((t) => t !== toast);
  }
}
