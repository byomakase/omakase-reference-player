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

export class DoublyLinkedListNode<T> {
  data: T;
  next: DoublyLinkedListNode<T> | undefined;
  prev: DoublyLinkedListNode<T> | undefined;

  constructor(data: T) {
    this.data = data;
    this.next = undefined;
    this.prev = undefined;
  }

  toString() {
    return JSON.stringify({
      data: `${this.data}`,
      next: `${this.next?.data}`,
      prev: `${this.prev?.data}`,
    });
  }
}

export class DoublyLinkedList<T> {
  private _head: DoublyLinkedListNode<T> | undefined;
  private _tail: DoublyLinkedListNode<T> | undefined;
  private count: number;

  constructor() {
    this._head = undefined;
    this._tail = undefined;
    this.count = 0;
  }

  // Add a new element to the end of the doubly linked list
  append(data: T): void {
    const newNode = new DoublyLinkedListNode(data);
    if (!this._head) {
      this._head = newNode;
      this._tail = newNode;
    } else {
      if (this._tail) {
        newNode.prev = this._tail;
        this._tail.next = newNode;
      }
      this._tail = newNode;
    }
    this.count++;
  }

  /**
   * Add a new element to the beginning of the doubly linked list
   * @param data
   */
  prepend(data: T): void {
    const newNode = new DoublyLinkedListNode(data);
    if (!this._head) {
      this._head = newNode;
      this._tail = newNode;
    } else {
      if (this._head) {
        newNode.next = this._head;
        this._head.prev = newNode;
      }
      this._head = newNode;
    }
    this.count++;
  }

  /**
   * Remove a given element from the doubly linked list
   * @param data
   */
  remove(data: T): void {
    if (!this._head) {
      return;
    }

    let current: DoublyLinkedListNode<T> | undefined = this._head;
    while (current) {
      if (current.data === data) {
        if (current.prev) {
          current.prev.next = current.next;
        } else {
          this._head = current.next;
        }

        if (current.next) {
          current.next.prev = current.prev;
        } else {
          this._tail = current.prev;
        }

        this.count--;
        return;
      }
      current = current.next;
    }
  }

  /**
   * Find and return the first Node with the specified value
   * @param value
   */
  findNode(value: T): DoublyLinkedListNode<T> | undefined {
    let current = this._head;
    while (current) {
      if (current.data === value) {
        return current;
      }
      current = current.next;
    }
    return undefined;
  }

  /**
   * Get the number of elements in the doubly linked list
   */
  size(): number {
    return this.count;
  }

  /**
   * Peek at the first element of the doubly linked list
   */
  peekFirst(): T | undefined {
    return this.headNode ? this.headNode.data : undefined;
  }

  /**
   * Peek at the last element of the doubly linked list
   */
  peekLast(): T | undefined {
    return this.tailNode ? this.tailNode.data : undefined;
  }

  /**
   * Get first node of the doubly linked list
   */
  get headNode(): DoublyLinkedListNode<T> | undefined {
    return this._head;
  }

  /**
   * Get last node of the doubly linked list
   */
  get tailNode(): DoublyLinkedListNode<T> | undefined {
    return this._tail;
  }

  toString(): string {
    let values: string[] = [];
    let current = this._head;
    while (current) {
      values.push(`${current}`);
      current = current.next;
    }
    return `[${values.join(', ')}]`;
  }
}
