import { provideZonelessChangeDetection, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InteractiveClockDisplayComponent } from './interactive-clock-display';

describe('InteractiveClockDisplayComponent', () => {
  let component: InteractiveClockDisplayComponent;
  let fixture: ComponentFixture<InteractiveClockDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveClockDisplayComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractiveClockDisplayComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('targetHours', 3);
    fixture.componentRef.setInput('targetMinutes', 20);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnChanges — reset on new problem', () => {
    it('should reset minuteAngle to 0 when targetMinutes changes', () => {
      // Simulate user dragging minute hand
      component['currentMinuteAngle'].set(120);
      expect(component.minuteAngle()).toBe(120);

      // New problem arrives with different minutes
      fixture.componentRef.setInput('targetMinutes', 40);
      component.ngOnChanges({
        targetMinutes: new SimpleChange(20, 40, false),
      });

      expect(component.minuteAngle()).toBe(0);
    });

    it('should reset hourAngle to 0 when targetHours changes and not locked', () => {
      component['currentHourAngle'].set(90);

      fixture.componentRef.setInput('targetHours', 6);
      component.ngOnChanges({
        targetHours: new SimpleChange(3, 6, false),
      });

      expect(component.hourAngle()).toBe(0);
    });

    it('should NOT reset hourAngle when lockHourHand is true', () => {
      fixture.componentRef.setInput('lockHourHand', true);
      fixture.componentRef.setInput('initialHourAngle', 90);
      component.ngOnChanges({
        lockHourHand: new SimpleChange(false, true, false),
      });
      // hour angle should be set to initialHourAngle, not 0
      expect(component.hourAngle()).toBe(90);
    });

    it('should keep minuteAngle if neither targetHours nor targetMinutes changed', () => {
      component['currentMinuteAngle'].set(120);

      // Only lockHourHand changes — minute hand should stay
      component.ngOnChanges({
        lockHourHand: new SimpleChange(false, true, false),
      });

      expect(component.minuteAngle()).toBe(120);
    });
  });

  describe('lockHourHand', () => {
    it('should set hourAngle to initialHourAngle when locked', () => {
      fixture.componentRef.setInput('lockHourHand', true);
      fixture.componentRef.setInput('initialHourAngle', 150);
      component.ngOnChanges({
        initialHourAngle: new SimpleChange(0, 150, false),
      });
      expect(component.hourAngle()).toBe(150);
    });
  });
});
