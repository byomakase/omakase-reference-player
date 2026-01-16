import {Component, HostBinding, inject, Input} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {AnnotationListComponent} from '../annotation-list/annotation-list.component';
import {AnnotationCreateComponent} from '../annotation-create/annotation-create.component';
import {AnnotationService} from './annotation.service';
import {AnnotationOffcanvasService} from '../annotation-offcanvas/annotation-offcanvas.service';

@Component({
    selector: 'div[appAnnotation]',
    imports: [CoreModule, SharedModule, AnnotationListComponent, AnnotationCreateComponent],
    template: `<div class="annotation-wrapper d-flex flex-column h-100">
    @if (annotationService.isInitialized) {
      <div class="annotation-header" style="opacity:1">
        <i (click)="openAnnotationOffcanvas()" appIcon="fly-out"></i>
      </div>
      <div class="annotation-list-wrapper flex-grow-1">
        <div appAnnotationList [isThreadingSupported]="isThreadingSupported"></div>
      </div>
      <div class="annotation-create-wrapper">
        <div appAnnotationCreate></div>
      </div>
    }
  </div>`
})
export class AnnotationComponent {
  @Input() isThreadingSupported = false;

  public annotationOffCanvasService = inject(AnnotationOffcanvasService);

  constructor(public annotationService: AnnotationService) {}

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'annotation-content';
  }

  public openAnnotationOffcanvas() {
    this.annotationOffCanvasService.open();
  }
}
