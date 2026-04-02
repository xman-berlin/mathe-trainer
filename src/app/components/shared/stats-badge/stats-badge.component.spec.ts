import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatsBadgeComponent } from './stats-badge.component';

describe('StatsBadgeComponent', () => {
  let component: StatsBadgeComponent;
  let fixture: ComponentFixture<StatsBadgeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(StatsBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should compute totalCount from correct and incorrect', () => {
    fixture.componentRef.setInput('correctCount', signal(7).asReadonly());
    fixture.componentRef.setInput('incorrectCount', signal(3).asReadonly());
    fixture.detectChanges();
    expect(component.totalCount()).toBe(10);
  });

  it('should compute totalCount as 0 with default inputs', () => {
    fixture.detectChanges();
    expect(component.totalCount()).toBe(0);
  });

  it('should render correct count', () => {
    fixture.componentRef.setInput('correctCount', signal(5).asReadonly());
    fixture.componentRef.setInput('incorrectCount', signal(3).asReadonly());
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('5');
  });

  it('should show total when showTotal is true', () => {
    fixture.componentRef.setInput('correctCount', signal(5).asReadonly());
    fixture.componentRef.setInput('incorrectCount', signal(3).asReadonly());
    fixture.componentRef.setInput('showTotal', true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('8');
  });

  it('should apply compact class when layout is compact', () => {
    fixture.componentRef.setInput('layout', 'compact');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const badges = el.querySelector('.stat-badges');
    expect(badges?.classList.contains('compact')).toBeTrue();
  });
});
