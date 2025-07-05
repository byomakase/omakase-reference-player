import {CommonModule} from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {SharedModule} from '../../shared.module';
import {Observable, Subject, Subscription, takeUntil} from 'rxjs';

@Component({
  selector: 'app-inline-edit',
  standalone: true,
  imports: [CommonModule, SharedModule],
  template: `
    <input [ngStyle]="{display: editing ? 'block' : 'none'}" #input class="inline-edit-input" [value]="displayText" (click)="$event.stopPropagation()" />
    <div [ngStyle]="{display: editing ? 'none' : 'block'}" class="inline-edit-text" (click)="handleClick()">{{ displayText }}</div>
  `,
})
export class InlineEditComponent implements OnDestroy {
  @Input() displayText!: string;

  @Output() clicked: EventEmitter<void> = new EventEmitter();
  @Output() edited: EventEmitter<string> = new EventEmitter();

  @ViewChild('input') inputEl!: ElementRef;

  public editing = false;

  private _clicked = false;
  private _doubleClickTime = 200;
  private _destroyed$ = new Subject<void>();
  private _open$?: Observable<void>;
  private _close$?: Observable<boolean>;
  private _openSubscription?: Subscription;
  private _closeSubscription?: Subscription;

  @Input()
  set open$(value: Observable<void>) {
    if (this._openSubscription) {
      this._openSubscription.unsubscribe();
    }
    this._open$ = value;
    this._openSubscription = this._open$.pipe(takeUntil(this._destroyed$)).subscribe(() => {
      this.openEdit();
    });
  }

  @Input()
  set close$(value: Observable<boolean>) {
    if (this._closeSubscription) {
      this._closeSubscription.unsubscribe();
    }
    this._close$ = value;
    this._closeSubscription = this._close$.pipe(takeUntil(this._destroyed$)).subscribe((saveValue) => {
      if (this.editing) {
        if (saveValue) {
          this.edited.next(this.inputEl.nativeElement.value);
        } else {
          this.inputEl.nativeElement.value = this.displayText;
        }
        this.editing = false;
      }
    });
  }

  constructor() {}

  ngOnDestroy() {
    this._destroyed$.next();
  }

  handleClick() {
    if (this.open$) {
      return;
    }
    if (this._clicked) {
      // double click
      this._clicked = false;
      this.openEdit();
    } else {
      this._clicked = true;
      setTimeout(() => {
        // single click
        if (this._clicked) {
          this.clicked.next();
          this._clicked = false;
        }
      }, this._doubleClickTime);
    }
  }

  openEdit() {
    this.editing = true;
    setTimeout(() => {
      this.inputEl.nativeElement.focus();
    });
  }
}
