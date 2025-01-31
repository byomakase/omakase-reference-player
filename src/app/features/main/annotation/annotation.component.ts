import {Component, HostBinding, Input} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {AnnotationListComponent} from '../annotation-list/annotation-list.component';
import {AnnotationCreateComponent} from '../annotation-create/annotation-create.component';

@Component({
  selector: 'div[appAnnotation]',
  standalone: true,
  imports: [CoreModule, SharedModule, AnnotationListComponent, AnnotationCreateComponent],
  template: `<div class="annotation-wrapper d-flex flex-column h-100">
    <div class="annotation-header" style="opacity:0"><i appIcon="fly-out"></i></div>
    <div class="annotation-list-wrapper flex-grow-1">
      <div appAnnotationList [isThreadingSupported]="isThreadingSupported"></div>
    </div>
    <div class="annotation-create-wrapper">
      <div appAnnotationCreate></div>
    </div>
  </div>`,
})
export class AnnotationComponent {
  @Input() isThreadingSupported = false;

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'annotation-content';
  }
}
