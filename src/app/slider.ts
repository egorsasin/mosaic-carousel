import {
  Component,
  contentChildren,
  ElementRef,
  inject,
  Injectable,
  OnInit,
  Signal,
  signal,
  TemplateRef,
  viewChild,
  WritableSignal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';

import { MosSlideDirective } from './slide.directive';
import { auditTime, filter, Observable, throttleTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const ITEMS_COUNT = 3;

export class Slide {
  constructor(
    public readonly id: string,
    public readonly template: TemplateRef<unknown>,
  ) {}
}

@Injectable({ providedIn: 'root' })
export class SliderIdService {
  private id: number = 0;

  public getId(): string {
    this.id = ++this.id;

    return `${this.id}`;
  }
}

@Component({
  selector: 'app-slider',
  imports: [NgTemplateOutlet, NgClass],
  templateUrl: './slider.html',
  styleUrl: './slider.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MosSliderComponent implements OnInit {
  private elementRef = inject(ElementRef);
  private idService: SliderIdService = inject(SliderIdService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  private index = 0;

  private get wrapperElement(): HTMLElement {
    return this.wrapper().nativeElement;
  }

  protected readonly wrapper = viewChild.required('wrapper', { read: ElementRef });
  protected items: Signal<readonly TemplateRef<unknown>[]> = contentChildren(MosSlideDirective, {
    read: TemplateRef,
  });
  protected itemWidth = 0;
  protected slides: WritableSignal<Slide[]> = signal<Slide[]>([]);
  protected itemsCount = signal<number>(ITEMS_COUNT);

  protected animated = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const resize = new Observable<ResizeObserverEntry[]>((subscriber) => {
      const nativeElement = this.elementRef.nativeElement;
      const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        subscriber.next(entries);
      });

      observer.observe(nativeElement);

      return () => {
        observer.unobserve(nativeElement);
        subscriber.complete();
      };
    });

    resize
      .pipe(
        filter((entries: ResizeObserverEntry[]) => !!entries.length),
        auditTime(50),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((entries) => {
        const entry = entries[0];
        const width = entry.contentRect.width;

        this.itemWidth = width / this.itemsCount();

        this.transformWrapper();
        this.cdr.markForCheck();
      });
  }

  public ngOnInit(): void {
    this.index = this.itemsCount();

    const items = this.items();

    const previousClones = items.slice(-this.index);
    const nextClones = items.slice(0, this.index);
    const slides: Slide[] = [...previousClones, ...items, ...nextClones].map(
      (item: TemplateRef<unknown>) => new Slide(this.getId(), item),
    );

    this.slides.set(slides);

    this.transformWrapper();
  }

  public onControlsClick(dir: number): void {
    if (this.animated) {
      return;
    }

    this.animated = true;
    this.index = this.index + dir;

    requestAnimationFrame(() => {
      this.transformWrapper.apply(this);
    });
  }

  public onTransitionEnd(event: TransitionEvent) {
    this.animated = false;

    const itemsCount = this.itemsCount();

    if (this.index >= this.slides().length - itemsCount) {
      this.index = itemsCount;

      this.transformWrapper();
    } else if (this.index <= 0) {
      this.index = itemsCount;

      this.transformWrapper();
    }
  }

  protected isActive(index: number): boolean {
    const itemsLength = this.items().length;
    const itemsCount = this.itemsCount();

    if (this.index < itemsCount) {
      return itemsLength - itemsCount + this.index === index;
    }

    if (this.index >= itemsCount + itemsLength) {
      return itemsLength + itemsCount - this.index === index;
    }

    return this.index - itemsCount === index;
  }

  private getId(): string {
    return this.idService.getId();
  }

  private transformWrapper(): void {
    const transform = this.itemWidth * this.index;

    this.wrapperElement.style.transform = `translateX(-${transform}px)`;
  }
}
