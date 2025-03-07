import {Pipe, PipeTransform} from '@angular/core';
import {ExtendedAnnotation} from './annotation-list.component';
import {Annotation} from '../annotation/annotation.state';
import {Observable} from 'rxjs';
import {AnnotationSortingStrategy} from './annotation-list.sorting';
@Pipe({
  name: 'annotationListSort',
  standalone: true,
})
export class AnnotationListSortPipe implements PipeTransform {
  transform(annotationList: ExtendedAnnotation[], sortingStrategy?: AnnotationSortingStrategy): ExtendedAnnotation[] {
    if (sortingStrategy) {
      return [...annotationList].sort(sortingStrategy);
    }

    return annotationList;
  }
}
