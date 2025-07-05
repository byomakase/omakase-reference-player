import {Pipe, PipeTransform} from '@angular/core';
import {ExtendedAnnotation} from './annotation-list.component';
import {Annotation} from '../annotation/annotation.state';
import {Observable} from 'rxjs';
@Pipe({
  name: 'annotationListFilter',
  standalone: true,
})
export class AnnotationListFilterPipe implements PipeTransform {
  transform(annotationList: ExtendedAnnotation[], filterToken: string, filterTokenUpdatedAt?: Date, selectedId?: string): ExtendedAnnotation[] {
    if (filterToken === '') {
      return annotationList;
    }

    const annotationListNoThreads = annotationList.flatMap((extendedAnnotation) => {
      const parent = {
        ...extendedAnnotation,
      } as ExtendedAnnotation;
      parent.children = [];

      const children = extendedAnnotation.children.map((child: Annotation & {timeDisplay: string; edit$: Observable<void>}): ExtendedAnnotation => {
        return {
          ...child,
          isSelected: false,
          removing: false,
          collapsed: parent.collapsed,
          children: [],
        };
      });

      return [parent, ...children];
    });

    const selectedAnnotation = annotationListNoThreads.find((annotation) => annotation.id === selectedId);
    if (selectedAnnotation) {
      selectedAnnotation.isSelected = true;
    }

    const filteredAnnotationList = annotationListNoThreads.filter((annotation) => annotation.body.includes(filterToken) || (filterTokenUpdatedAt && annotation.createdAt > filterTokenUpdatedAt));

    return filteredAnnotationList;
  }
}
