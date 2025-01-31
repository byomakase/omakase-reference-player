import {CommonModule} from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output} from '@angular/core';
import {IconModule} from '../icon/icon.module';
import {ColorUtil} from '../../../util/color-util';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [IconModule, CommonModule],
  template: `<div class="color-picker-container d-flex">
    @for (color of colors; track color) {
      <div class="color-picker-color" [ngStyle]="{'background-color': color}" (click)="selectColor(color)">
        @if (color === activeColor) {
          <i appIcon="checkbox-checked" [ngStyle]="{color: checkboxColor}"></i>
        }
      </div>
    }
  </div>`,
})
export class ColorPickerComponent implements OnInit {
  @Input() colors!: string[];
  @Input() activeColor?: string;

  @Output() selectedColor: EventEmitter<string> = new EventEmitter();
  @Output() clickOutside = new EventEmitter<void>();

  public checkboxColor = '#ffffff';

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    if (this.activeColor) {
      this.checkboxColor = ColorUtil.getContrastingTextColor(this.activeColor);
    }
  }

  selectColor(color: string) {
    this.selectedColor.emit(color);
    this.clickOutside.emit();
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement: HTMLElement): void {
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}
