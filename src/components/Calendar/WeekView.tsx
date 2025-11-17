// src/components/Calendar/WeekView.tsx
import React, { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { isSameDay, addDays, formatTimeString, isToday } from '../../utils/dateUtils';
import { Event } from '../../types';
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import TimeIndicator from '../Shared/TimeIndicator';

const HOUR_HEIGHT = 48; // Pikselikorkeus yhdelle tunnille (vastaa h-12 Tailwindissä)

// Apufunktio minuuttien laskemiseen varmemmin
const getMinutesFromEvent = (event: Event): number => {
  // 1. Yritä käyttää start_time -merkkijonoa (esim "08:10" tai "08:10:00")
  if (event.start_time && typeof event.start_time === 'string' && event.start_time.includes(':')) {
    const [hours, minutes] = event.start_time.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return hours * 60 + minutes;
    }
  }
  
  // 2. Fallback: Käytä Date-objektin aikaa, jos merkkijono puuttuu tai on rikki
  const eventDate = new Date(event.date);
  return eventDate.getHours() * 60 + eventDate.getMinutes();
};

// Apufunktio tapahtumien asettelun laskemiseen
const useEventLayout = (eventsByDay: Map<string, Event[]>, displayDates: Date[]) => {
  return useMemo(() => {
    const layoutMap = new Map<string, (Event & { layout: { top: number; height: number; left: string; width: string } })[]>();

    displayDates.forEach(date => {
      const dayKey = date.toISOString().split('T')[0];
      const timedEvents = (eventsByDay.get(dayKey) || [])
        .filter(e => !!e.start_time || new Date(e.date).getHours() !== 0) // Näytä jos start_time on tai Date-objektissa on aika
        .sort((a, b) => {
          const minA = getMinutesFromEvent(a);
          const minB = getMinutesFromEvent(b);
          return minA - minB;
        });

      if (timedEvents.length === 0) {
        layoutMap.set(dayKey, []);
        return;
      }

      // Muunnetaan tapahtumat minuuteiksi päivän alusta
      const eventsWithMinutes = timedEvents.map(event => {
        const startMinutes = getMinutesFromEvent(event);

        let endMinutes;
        if (event.end_time && event.end_time.includes(':')) {
          const [endHour, endMinute] = event.end_time.split(':').map(Number);
          endMinutes = endHour * 60 + endMinute;
        } else {
          endMinutes = startMinutes + 60; // Oletuskesto 60 min
        }
        
        // Varmistetaan, että loppuaika on alkuaikaa myöhemmin
        if (endMinutes <= startMinutes) endMinutes = startMinutes + 30;

        return { ...event, startMinutes, endMinutes };
      });

      // Ryhmitellään päällekkäiset tapahtumat (Cluster logic)
      const clusters: (typeof eventsWithMinutes)[] = [];
      if (eventsWithMinutes.length > 0) {
        let currentCluster = [eventsWithMinutes[0]];
        for (let i = 1; i < eventsWithMinutes.length; i++) {
          const event = eventsWithMinutes[i];
          const lastEventInCluster = currentCluster[currentCluster.length - 1];
          // Jos tapahtuma alkaa ennen kuin edellinen loppuu (pieni puskuri visuaalisuuden vuoksi)
          if (event.startMinutes < lastEventInCluster.endMinutes) {
            currentCluster.push(event);
          } else {
            clusters.push(currentCluster);
            currentCluster = [event];
          }
        }
        clusters.push(currentCluster);
      }

      const dayLayoutEvents: (Event & { layout: any })[] = [];

      clusters.forEach(cluster => {
        const columns: (typeof cluster)[] = [];
        cluster.forEach(event => {
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
            const lastEventInColumn = columns[i][columns[i].length - 1];
            if (lastEventInColumn.endMinutes <= event.startMinutes) {
              columns[i].push(event);
              placed = true;
              break;
            }
          }
          if (!placed) {
            columns.push([event]);
          }
        });

        const totalColumns = columns.length;
        columns.forEach((column, colIndex) => {
          column.forEach(event => {
            const top = (event.startMinutes / 60) * HOUR_HEIGHT;
            const height = ((event.endMinutes - event.startMinutes) / 60) * HOUR_HEIGHT;

            dayLayoutEvents.push({
              ...event,
              layout: {
                top,
                height: Math.max(height, 24), // Minimikorkeus jotta teksti mahtuu
                width: `calc(${100 / totalColumns}% - 2px)`,
                left: `calc(${(colIndex / totalColumns) * 100}% + 1px)`,
              }
            });
          });
        });
      });

      layoutMap.set(dayKey, dayLayoutEvents);
    });

    return layoutMap;
  }, [eventsByDay, displayDates]);
};


export default function WeekView() {
  const { state, dispatch } = useApp();
  const { selectedDate, events } = state;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentTime = useCurrentTime();
  
  const [showWeekend, setShowWeekend] = useState(false);

  // Scrollaa automaattisesti nykyhetkeen tai klo 08:00
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      const currentHour = currentTime.getHours();
      // Jos kello on yöllä (00-06), näytä aamu (08:00). Muuten näytä nykyhetki miinus 1 tunti.
      const hourToShow = (currentHour > 6 && isToday(selectedDate)) ? currentHour - 1 : 7;
      scrollContainerRef.current.scrollTop = Math.max(0, hourToShow * HOUR_HEIGHT);
    }
  }, [state.selectedDate, state.currentView, showWeekend]); // Poistettu currentTime riippuvuudesta ettei se hypi jatkuvasti

  const getMondayOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const monday = useMemo(() => getMondayOfWeek(selectedDate), [selectedDate]);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  }), [monday]);

  const weekDays = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
  
  const displayDates = useMemo(() => showWeekend ? weekDates : weekDates.slice(0, 5), [showWeekend, weekDates]);
  const displayDays = useMemo(() => showWeekend ? weekDays : weekDays.slice(0, 5), [showWeekend]);

  const gridColumns = `60px repeat(${displayDates.length}, 1fr)`;

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    displayDates.forEach(day => {
      const dayEvents = events.filter(event => isSameDay(new Date(event.date), day));
      map.set(day.toISOString().split('T')[0], dayEvents);
    });
    return map;
  }, [displayDates, events]);

  const laidOutEventsByDay = useEventLayout(eventsByDay, displayDates);

  const handleEventClick = (event: Event) => {
    if (event.type === 'deadline' && event.project_id) {
      if (event.project_id === GENERAL_TASKS_PROJECT_ID) {
        return; 
      }
      dispatch({ type: 'TOGGLE_PROJECT_MODAL', payload: event.project_id });
    } else {
      dispatch({ type: 'TOGGLE_EVENT_DETAILS_MODAL', payload: event });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = addDays(selectedDate, direction === 'next' ? 7 : -7);
    dispatch({ type: 'SET_SELECTED_DATE', payload: newDate });
  };

  const goToThisWeek = () => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: new Date() });
  };

  const getWeekRange = () => {
    const startDate = weekDates[0]; 
    const endDate = weekDates[6];  

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.getDate()}. - ${endDate.getDate()}. ${startDate.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' })}`;
    } else {
      return `${startDate.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}. - ${endDate.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' })}.`;
    }
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  
  const renderCurrentTimeIndicator = () => {
    const todayIndex = displayDates.findIndex(date => isToday(date));
    if (todayIndex === -1) return null;

    // Lasketaan sijainti tarkasti minuuttien mukaan
    const topPosition = (currentTime.getHours() * HOUR_HEIGHT) + (currentTime.getMinutes() * HOUR_HEIGHT / 60);
    const gridColumnStart = todayIndex + 2; // +1 grid-linjalle, +1 koska aikasarake on eka

    return (
        <div style={{ gridColumn: `${gridColumnStart} / span 1`, position: 'relative', height: 0, zIndex: 50 }}>
             <TimeIndicator top={topPosition} currentTime={currentTime} />
        </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white z-30 rounded-t-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <h3 className="text-lg font-semibold text-gray-900 min-w-[250px] text-center hidden sm:block">{getWeekRange()}</h3>
            <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <button onClick={goToThisWeek} className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium">Tämä viikko</button>
        </div>
        <button onClick={() => setShowWeekend(!showWeekend)} className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700">
          {showWeekend ? (<><EyeOff className="w-4 h-4" /><span className="hidden sm:inline">Piilota vkl</span></>) : (<><Eye className="w-4 h-4" /><span className="hidden sm:inline">Näytä vkl</span></>)}
        </button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
        {/* Header row */}
        <div className="sticky top-0 bg-white z-20 shadow-sm">
            <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: gridColumns }}>
              <div className="py-4 px-2 text-center bg-gray-50 border-r border-gray-100"></div>
              {displayDates.map((date, index) => (
                <div key={`header-${index}`} className={`py-2 px-2 text-center border-r border-gray-100 last:border-r-0 ${isToday(date) ? 'bg-blue-50' : 'bg-white'}`}>
                  <div className={`text-sm font-medium ${isToday(date) ? 'text-blue-600' : 'text-gray-600'}`}>{displayDays[index]}</div>
                  <div className={`text-lg font-semibold mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full ${isToday(date) ? 'bg-blue-600 text-white' : 'text-gray-900'}`}>{date.getDate()}</div>
                </div>
              ))}
            </div>

            {/* All-day events row */}
            <div className="grid border-b border-gray-200 bg-white" style={{ gridTemplateColumns: gridColumns }}>
                <div className="py-2 px-2 text-xs font-medium text-gray-400 text-right flex items-center justify-end bg-gray-50 border-r border-gray-100">koko pv</div>
                {displayDates.map((date, index) => {
                    const allDayEvents = (eventsByDay.get(date.toISOString().split('T')[0]) || []).filter(e => !e.start_time);
                    return (
                        <div key={`allday-${index}`} className="p-1 border-r border-gray-100 min-h-[32px] space-y-1">
                            {allDayEvents.map(event => (
                                <div
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                    className="text-xs px-2 py-1 rounded border-l-4 cursor-pointer hover:opacity-80 transition-shadow shadow-sm truncate font-medium"
                                    style={{ backgroundColor: event.color + '20', color: event.color, borderColor: event.color }}
                                    title={event.title}
                                >
                                    {event.title}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Scrollable Grid */}
        <div className="relative min-h-full">
            {/* Grid Lines */}
            <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
                <div className="col-start-1 bg-gray-50 border-r border-gray-200">
                    {timeSlots.map((time, i) => (
                        <div key={time} className="h-12 text-xs font-medium text-gray-400 pr-2 text-right flex items-start pt-1 relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                             <span className="-mt-2">{i === 0 ? '' : time}</span>
                        </div>
                    ))}
                </div>
                <div className="col-start-2 col-span-full grid relative" style={{ gridTemplateColumns: `repeat(${displayDates.length}, 1fr)` }}>
                    {/* Background Grid Lines */}
                    {displayDates.map((_, dateIndex) => (
                         <div key={dateIndex} className="border-r border-gray-100 last:border-r-0">
                             {timeSlots.map((time, i) => (
                                 <div key={time} className={`border-b border-gray-100 ${i === 12 ? 'border-b-2 border-gray-200' : ''}`} style={{ height: `${HOUR_HEIGHT}px` }} />
                             ))}
                         </div>
                    ))}
                </div>
            </div>
            
            {/* Events Overlay */}
            <div className="absolute top-0 left-0 w-full h-full grid pointer-events-none" style={{ gridTemplateColumns: gridColumns }}>
                {renderCurrentTimeIndicator()}
                <div className="col-start-1"></div> {/* Empty spacer for time column */}
                 {displayDates.map((date, dateIndex) => {
                    const timedEvents = laidOutEventsByDay.get(date.toISOString().split('T')[0]) || [];
                    return (
                        <div key={dateIndex} className="relative h-full pointer-events-auto">
                             {timedEvents.map((event) => {
                                return (
                                    <div
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                        className="absolute rounded px-2 py-1 cursor-pointer hover:opacity-90 transition-all text-xs z-10 border-l-4 shadow-sm hover:shadow-md flex flex-col overflow-hidden"
                                        style={{
                                            top: `${event.layout.top}px`,
                                            height: `${event.layout.height}px`,
                                            left: event.layout.left,
                                            width: event.layout.width,
                                            backgroundColor: event.color + '15', // Hieman vaaleampi tausta
                                            borderColor: event.color,
                                            color: '#1f2937'
                                        }}
                                    >
                                        <div className="font-semibold truncate leading-tight">{event.title}</div>
                                        {event.start_time && (
                                          <div className="text-[10px] opacity-75 mt-0.5 font-medium truncate">
                                            {formatTimeString(event.start_time)}
                                            {event.end_time && ` - ${formatTimeString(event.end_time)}`}
                                          </div>
                                        )}
                                        {event.description && event.layout.height > 40 && (
                                          <div className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-tight">{event.description}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                 })}
            </div>
        </div>
      </div>
    </div>
  );
}
