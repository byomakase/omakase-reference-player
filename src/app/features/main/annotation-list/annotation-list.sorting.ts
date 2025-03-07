import {Annotation} from '../annotation/annotation.state';

export type AnnotationSortingStrategy = (a: Annotation, b: Annotation) => number;

export const timecodeSortingStrategy: AnnotationSortingStrategy = (a: Annotation, b: Annotation) => {
  if (a.start !== undefined && b.start !== undefined) {
    return a.start > b.start ? 1 : b.start > a.start ? -1 : 0;
  } else if (a.start === undefined && b.start === undefined) {
    return a.createdAt.getTime() - b.createdAt.getTime();
  } else if (a.start === undefined) {
    return -1;
  } else {
    return 1;
  }
};

export const createdSortingStrategy: AnnotationSortingStrategy = (a: Annotation, b: Annotation) => {
  return a.createdAt <= b.createdAt ? -1 : 1;
};
