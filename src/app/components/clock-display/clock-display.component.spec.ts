import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClockDisplayComponent } from './clock-display';

describe('ClockDisplayComponent', () => {
  let component: ClockDisplayComponent;
  let fixture: ComponentFixture<ClockDisplayComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(ClockDisplayComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('hours', 12);
    fixture.componentRef.setInput('minutes', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute hour angle', () => {
    fixture.componentRef.setInput('hours', 12);
    fixture.componentRef.setInput('minutes', 0);
    fixture.detectChanges();
    expect(component.hourAngle()).toBe(360);

    fixture.componentRef.setInput('hours', 3);
    fixture.componentRef.setInput('minutes', 0);
    fixture.detectChanges();
    expect(component.hourAngle()).toBe(90);

    fixture.componentRef.setInput('hours', 6);
    fixture.componentRef.setInput('minutes', 30);
    fixture.detectChanges();
    expect(component.hourAngle()).toBe(195);
  });

  it('should compute minute angle', () => {
    fixture.componentRef.setInput('minutes', 0);
    fixture.detectChanges();
    expect(component.minuteAngle()).toBe(0);

    fixture.componentRef.setInput('minutes', 15);
    fixture.detectChanges();
    expect(component.minuteAngle()).toBe(90);

    fixture.componentRef.setInput('minutes', 30);
    fixture.detectChanges();
    expect(component.minuteAngle()).toBe(180);

    fixture.componentRef.setInput('minutes', 45);
    fixture.detectChanges();
    expect(component.minuteAngle()).toBe(270);
  });

  it('should have 12 hour markers', () => {
    expect(component.hourMarkers.length).toBe(12);
  });

  it('should get hour position on clock face', () => {
    const pos12 = component.getHourPosition(12);
    expect(pos12.x).toBeCloseTo(100, 0);
    expect(pos12.y).toBeCloseTo(20, 0);

    const pos3 = component.getHourPosition(3);
    expect(pos3.x).toBeCloseTo(180, 0);
    expect(pos3.y).toBeCloseTo(100, 0);

    const pos6 = component.getHourPosition(6);
    expect(pos6.x).toBeCloseTo(100, 0);
    expect(pos6.y).toBeCloseTo(180, 0);

    const pos9 = component.getHourPosition(9);
    expect(pos9.x).toBeCloseTo(20, 0);
    expect(pos9.y).toBeCloseTo(100, 0);
  });
});
