import {CommonModule} from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild} from '@angular/core';
import {SharedModule} from '../../shared.module';

@Component({
  selector: 'app-inline-edit',
  standalone: true,
  imports: [CommonModule, SharedModule],
  template: `
    @if (editing) {
      <input #input class="inline-edit-input" [value]="displayText" />
      <div class="inline-edit-actions">
        <span (click)="edited.emit(input.value); editing = false"><i appIcon="confirm"></i></span>
        <span (click)="editing = false"><i appIcon="reject"></i></span>
      </div>
    } @else {
      <div class="inline-edit-text" (click)="handleClick()">{{ displayText }}</div>
    }
  `,
})
export class InlineEditComponent {
  @Input() displayText!: string;

  @Output() clicked: EventEmitter<void> = new EventEmitter();
  @Output() edited: EventEmitter<string> = new EventEmitter();

  @ViewChild('input') inputEl!: ElementRef;

  public editing = false;

  private _clicked = false;
  private _doubleClickTime = 200;

  constructor(private elementRef: ElementRef) {}

  handleClick() {
    if (this._clicked) {
      // double click
      this._clicked = false;
      requestAnimationFrame(() => {
        this.editing = true;
        requestAnimationFrame(() => {
          this.inputEl.nativeElement.focus();
        });
      });
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

  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement: HTMLElement): void {
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    if (!clickedInside) {
      this.editing = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (event.code === 'Enter' && this.editing && event.target === this.inputEl.nativeElement) {
      this.edited.next(this.inputEl.nativeElement.value);
      this.editing = false;
    }
  }
}
