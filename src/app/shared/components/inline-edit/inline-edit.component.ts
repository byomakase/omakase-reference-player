import {CommonModule} from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {SharedModule} from '../../shared.module';
import {Observable, Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'app-inline-edit',
  standalone: true,
  imports: [CommonModule, SharedModule],
  template: `
    @if (editing) {
      <input #input class="inline-edit-input" [value]="displayText" (click)="$event.stopPropagation()" />
      <div class="inline-edit-actions">
        <span (click)="edited.emit(input.value); editing = false"><i appIcon="confirm"></i></span>
        <span (click)="editing = false"><i appIcon="reject"></i></span>
      </div>
    } @else {
      <div class="inline-edit-text" (click)="handleClick()">{{ displayText }}</div>
    }
  `,
})
export class InlineEditComponent implements OnInit, OnDestroy {
  @Input() displayText!: string;
  @Input() edit$?: Observable<void>;

  @Output() clicked: EventEmitter<void> = new EventEmitter();
  @Output() edited: EventEmitter<string> = new EventEmitter();

  @ViewChild('input') inputEl!: ElementRef;

  public editing = false;

  private _clicked = false;
  private _doubleClickTime = 200;
  private _destroyed$ = new Subject<void>();

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    if (this.edit$) {
      this.edit$.pipe(takeUntil(this._destroyed$)).subscribe(() => {
        this.openEdit();
      });
    }
  }

  ngOnDestroy() {
    this._destroyed$.next();
  }

  handleClick() {
    if (this.edit$) {
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
    requestAnimationFrame(() => {
      this.editing = true;
      requestAnimationFrame(() => {
        this.inputEl.nativeElement.focus();
      });
    });
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement: HTMLElement): void {
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    if (!clickedInside) {
      this.editing = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (this.editing && event.target === this.inputEl.nativeElement) {
      if (event.code === 'Enter') {
        this.edited.next(this.inputEl.nativeElement.value);
        this.editing = false;
      } else if (event.code === 'Escape') {
        this.editing = false;
      }
    }
  }
}
