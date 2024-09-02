/*
 * Copyright 2024 ByOmakase, LLC (https://byomakase.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {HttpParams} from '@angular/common/http';
import {HttpParamConvertable, HttpParamsConvertable} from './http-params-builder';

interface UriExpression {
  getUriExpression(): string;
}

abstract class FilterOperator implements UriExpression {
  static EQUAL: FilterOperator = {
    getUriExpression(): string {
      return 'eq';
    }
  }

  static CONTAINS: FilterOperator = {
    getUriExpression(): string {
      return 'contains';
    }
  }

  static LESS_THAN: FilterOperator = {
    getUriExpression(): string {
      return 'lt';
    }
  }

  static GREATER_THAN: FilterOperator = {
    getUriExpression(): string {
      return 'gt';
    }
  }

  static BETWEEN: FilterOperator = {
    getUriExpression(): string {
      return 'btw';
    }
  }

  abstract getUriExpression(): string;
}

export class FilterPredicate implements HttpParamConvertable {
  private _name: string;
  private _operator: FilterOperator;
  private _value: string;

  private constructor(name: string, operator: FilterOperator, value: string) {
    this._name = name;
    this._operator = operator;
    this._value = value;
  }

  public static equal(name: string, value: string): FilterPredicate {
    return new FilterPredicate(name, FilterOperator.EQUAL, value);
  }

  public static contains(name: string, value: string): FilterPredicate {
    return new FilterPredicate(name, FilterOperator.CONTAINS, value);
  }

  public static lessThan(name: string, value: string): FilterPredicate {
    return new FilterPredicate(name, FilterOperator.LESS_THAN, value);
  }

  public static greaterThan(name: string, value: string): FilterPredicate {
    return new FilterPredicate(name, FilterOperator.GREATER_THAN, value);
  }

  public static between(name: string, from: string, to: string): FilterPredicate {
    return new FilterPredicate(name, FilterOperator.BETWEEN, `${from},${to}`);
  }

  getHttpParamName(): string {
    return `filter.${this._name}[${this._operator.getUriExpression()}]`;
  }

  getHttpParamValue(): string {
    return this._value;
  }
}

export class FilterBuilder implements HttpParamsConvertable {
  private _predicates: FilterPredicate[];

  public static instance(): FilterBuilder {
    return new FilterBuilder();
  }

  private constructor() {
    this._predicates = [];
  }

  equal(name: string, value: string): FilterBuilder {
    this.append(FilterPredicate.equal(name, value));
    return this;
  }

  contains(name: string, value: string): FilterBuilder {
    this.append(FilterPredicate.contains(name, value));
    return this;
  }

  lessThan(name: string, value: string): FilterBuilder {
    this.append(FilterPredicate.lessThan(name, value));
    return this;
  }

  greaterThan(name: string, value: string): FilterBuilder {
    this.append(FilterPredicate.greaterThan(name, value));
    return this;
  }

  between(name: string, from: string, to: string): FilterBuilder {
    this.append(FilterPredicate.between(name, from, to));
    return this;
  }

  lessThanOrBetweenOrGreaterThan(name: string, from: string | null | undefined, to: string | null | undefined): FilterBuilder {
    if (from && to) {
      this.append(FilterPredicate.between(name, from, to));
    } else if (from) {
      this.append(FilterPredicate.greaterThan(name, from));
    } else if (to) {
      this.append(FilterPredicate.lessThan(name, to));
    } else {
      throw new Error('filter predicate could not be set, both "from" and "to" are not set')
    }
    return this;
  }

  append(predicate: FilterPredicate): FilterBuilder {
    this._predicates.push(predicate);
    return this;
  }

  toHttpParams(): HttpParams {
    let httpParams = new HttpParams();
    this._predicates.forEach(predicate => {
      httpParams = httpParams.append(predicate.getHttpParamName(), predicate.getHttpParamValue());
    })
    return httpParams;
  }
}
