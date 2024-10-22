'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Inbox, Calendar as CalendarIcon, Sun, Layers, CalendarDays, ArrowRight, GripVertical, Trash2, MoreVertical, ChevronRight, Copy, Check, X, Save } from "lucide-react";
import { format, setHours, setMinutes, isFuture, isPast, isToday, addDays, addMonths, startOfDay, endOfDay } from "date-fns";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useSwipeable } from 'react-swipeable';

type Task = {
  id: string;
  content: string;
  section: string;
  datetime?: Date;
  completed: boolean;
};

type DragItem = {
  type: string;
  id: string;
  index: number;
};

const TaskItem: React.FC<{
  task: Task;
  index: number;
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  handleTaskClick: (taskId: string) => void;
  selectedTasks: string[];
  toggleTaskCompletion: (taskId: string) => void;
  openDateTimeDialog: (taskId: string) => void;
  moveBulkTasks: (newSection: string) => void;
  moveTaskToSection: (taskId: string, newSection: string) => void;
  duplicateTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  openMoveToDialog: (taskId: string) => void;
  updateTaskContent: (taskId: string, newContent: string) => void;
}> = React.memo(({ task, index, moveTask, handleTaskClick, selectedTasks, toggleTaskCompletion, openDateTimeDialog, moveBulkTasks, moveTaskToSection, duplicateTask, deleteTask, openMoveToDialog, updateTaskContent }) => {
  const ref = useRef<HTMLLIElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(task.content);
  const inputRef = useRef<HTMLInputElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'task',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveTask(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'task',
    item: () => {
      return { id: task.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.4 : 1;
  drag(drop(ref));

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      if (Math.abs(eventData.deltaX) <= 100) {
        setSwipeOffset(eventData.deltaX);
      }
    },
    onSwipedLeft: (eventData) => {
      if (eventData.deltaX < -100) {
        duplicateTask(task.id);
      }
      setSwipeOffset(0);
    },
    onSwipedRight: (eventData) => {
      if (eventData.deltaX > 100) {
        deleteTask(task.id);
      }
      setSwipeOffset(0);
    },
    onTap: () => {
      setSwipeOffset(0);
    },
    trackMouse: true,
  });

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    updateTaskContent(task.id, editedContent);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditedContent(task.content);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <li
      ref={ref}
      className="relative overflow-hidden touch-pan-y"
      style={{ opacity }}
      data-handler-id={handlerId}
      {...swipeHandlers}
    >
      <div
        className={`flex items-center space-x-2 p-2 rounded-sm cursor-move transition-all duration-200 ${
          selectedTasks.includes(task.id) ? 'bg-[#018484]' : 'bg-[#0a3169] hover:bg-[#018484]'
        }`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onClick={() => handleTaskClick(task.id)}
        onDoubleClick={handleDoubleClick}
      >
        <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing" />
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => toggleTaskCompletion(task.id)}
          className="h-4 w-4 border-white"
        />
        {isEditing ? (
          <div className="flex-grow flex items-center">
            <Input
              ref={inputRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow bg-white text-[#072146] border-[#018484] focus:border-[#072146] focus:ring-[#072146] text-base h-8"
            />
            <Button
              onClick={handleSave}
              size="sm"
              className="ml-2 bg-[#018484] hover:bg-[#016e6e] text-white h-8 w-8 p-0 flex items-center justify-center"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className={`flex-grow text-base text-white ${task.completed ? 'line-through text-gray-400' : ''}`}>
            {task.content}
          </span>
        )}
        {task.datetime && (
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs px-1 py-0.5 ${
              isToday(task.datetime) ? 'text-green-300' :
              isFuture(task.datetime) ? 'text-yellow-300' :
              'text-red-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              openDateTimeDialog(task.id);
            }}
          >
            {format(task.datetime, 'MMM d, HH:mm')}
          </Button>
        )}
        {selectedTasks.includes(task.id) && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 text-xs h-6 px-1"
            onClick={(e) => {
              e.stopPropagation();
              openMoveToDialog(task.id);
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div
        className="absolute top-0 left-0 bottom-0 flex items-center justify-center bg-[#018484] text-white transition-transform duration-200 ease-out"
        style={{
          width: '100px',
          transform: `translateX(${Math.min(swipeOffset - 100, 0)}px)`,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-full w-full flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            duplicateTask(task.id);
            setSwipeOffset(0);
          }}
        >
          <Copy className="h-5 w-5 mr-2" />
          Duplicate
        </Button>
      </div>
      <div
        className="absolute top-0 right-0 bottom-0 flex items-center justify-center bg-red-500 text-white transition-transform duration-200 ease-out"
        style={{
          width: '100px',
          transform: `translateX(${Math.max(swipeOffset + 100, 0)}px)`,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-full w-full flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            deleteTask(task.id);
            setSwipeOffset(0);
          }}
        >
          <Trash2 className="h-5 w-5 mr-2" />
          Delete
        </Button>
      </div>
    </li>
  );
});

TaskItem.displayName = 'TaskItem';

export function GtdEasy() {
  const [newTask, setNewTask] = useState('');
  const [activeView, setActiveView] = useState('inbox');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [dateTimeDialogOpen, setDateTimeDialogOpen] = useState(false);
  const [moveToDialogOpen, setMoveToDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [showScrollGuide, setShowScrollGuide] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: 'move' | 'bulk' | 'add', taskIds: string[], content?: string } | null>(null);
  const [showTodayCalendarTasks, setShowTodayCalendarTasks] = useState(false);
  const [windowHeight, setWindowHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowHeight(window.innerHeight);
      const handleResize = () => setWindowHeight(window.innerHeight);
      window.addEventListener('resize', handleResize);

      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const storedTasks = localStorage.getItem('gtdEasyTasks');
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        // Convert datetime strings back to Date objects
        const tasksWithDates = parsedTasks.map((task: Task) => ({
          ...task,
          datetime: task.datetime ? new Date(task.datetime) : undefined
        }));
        setTasks(tasksWithDates);
      } catch (error) {
        console.error('Error parsing stored tasks:', error);
      }
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem('gtdEasyTasks', JSON.stringify(tasks));
  }, [tasks]);

  const generateTimeOptions = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const roundedMinute = Math.floor(currentMinute / 30) * 30;

    return Array.from({ length: 24 * 2 }, (_, i) => {
      const totalMinutes = (currentHour * 60 + roundedMinute + i * 30) % (24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    });
  }, []);

  const timeOptions = useMemo(generateTimeOptions, [generateTimeOptions]);

  const handleAddTask = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.trim()) {
      if (activeView === 'calendar') {
        setPendingAction({ action: 'add', taskIds: [], content: newTask });
        setDateTimeDialogOpen(true);
      } else {
        const task: Task = {
          id: Date.now().toString(),
          content: newTask,
          section: activeView,
          completed: false
        };
        setTasks(prevTasks => [...prevTasks, task]);
        setNewTask('');
      }
    }
  }, [newTask, activeView]);

  const moveTask = useCallback((dragIndex: number, hoverIndex: number) => {
    setTasks((prevTasks) => {
      const updatedTasks = [...prevTasks];
      const [reorderedItem] = updatedTasks.splice(dragIndex, 1);
      updatedTasks.splice(hoverIndex, 0, reorderedItem);
      return updatedTasks;
    });
  }, []);

  const moveTaskToSection = useCallback((taskId: string, newSection: string) => {
    if (newSection === 'calendar') {
      setPendingAction({ action: 'move', taskIds: [taskId] });
      setDateTimeDialogOpen(true);
    } else if (newSection === 'delete') {
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      setSelectedTasks(prevSelected => prevSelected.filter(id => id !== taskId));
    } else {
      setTasks(prevTasks => prevTasks.map(task => {
        if (task.id === taskId) {
          return { ...task, section: newSection, datetime: undefined };
        }
        return task;
      }));
    }
    setMoveToDialogOpen(false);
  }, []);

  const moveBulkTasks = useCallback((newSection: string) => {
    if (newSection === 'calendar') {
      setPendingAction({ action: 'bulk', taskIds: selectedTasks });
      setDateTimeDialogOpen(true);
    } else if (newSection === 'delete') {
      setTasks(prevTasks => prevTasks.filter(task => !selectedTasks.includes(task.id)));
      setSelectedTasks([]);
    } else {
      setTasks(prevTasks => prevTasks.map(task => {
        if (selectedTasks.includes(task.id)) {
          return { ...task, section: newSection, datetime: undefined };
        }
        return task;
      }));
      setSelectedTasks([]);
    }
    setMoveToDialogOpen(false);
  }, [selectedTasks]);

  const handleDateTimeSelection = useCallback(() => {
    if (selectedDate && selectedTime && pendingAction) {
      try {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
          throw new Error('Invalid time format');
        }
        const datetime = setMinutes(setHours(selectedDate, hours), minutes);

        if (pendingAction.action === 'add') {
          const newTask: Task = {
            id: Date.now().toString(),
            content: pendingAction.content || '',
            section: 'calendar',
            datetime: datetime,
            completed: false
          };
          setTasks(prevTasks => [...prevTasks, newTask]);
          setNewTask('');
        } else {
          setTasks(prevTasks => prevTasks.map(task => {
            if (pendingAction.taskIds.includes(task.id)) {
              return { ...task, section: 'calendar', datetime: datetime };
            }
            return task;
          }));
          setSelectedTasks([]);
        }
      } catch (error) {
        console.error('Error setting date and time:', error);
      }
    }
    setDateTimeDialogOpen(false);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setPendingAction(null);
  }, [selectedDate, selectedTime, pendingAction]);

  const handleTaskClick = useCallback((taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  }, []);

  const duplicateTask = useCallback((taskId: string) => {
    setTasks(prevTasks => {
      const taskToDuplicate = prevTasks.find(task => task.id === taskId);
      if (taskToDuplicate) {
        const newTask: Task = {
          ...taskToDuplicate,
          id: Date.now().toString(),
          content: `${taskToDuplicate.content} (Copy)`,
        };
        return [...prevTasks, newTask];
      }
      return prevTasks;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    setSelectedTasks(prevSelected => prevSelected.filter(id => id !== taskId));
  }, []);

  const openMoveToDialog = useCallback((taskId: string) => {
    setMoveToDialogOpen(true);
  }, []);

  const moveAllTodayTasksToWeek = useCallback(() => {
    setTasks(prevTasks => prevTasks.map(task => 
      task.section === 'today' ? { ...task, section: 'week' } : task
    ));
  }, []);

  const toggleTaskCompletion = useCallback((taskId: string) => {
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  }, []);

  const openDateTimeDialog = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const now = new Date();
    if (task && task.datetime) {
      setSelectedDate(task.datetime);
      setSelectedTime(format(task.datetime, 'HH:mm'));
    } else {
      setSelectedDate(now);
      setSelectedTime(format(now, 'HH:mm'));
    }
    setPendingAction({ action: 'move', taskIds: [taskId] });
    setDateTimeDialogOpen(true);
  }, [tasks]);

  const handleDateSelection = useCallback((days: number) => {
    const newDate = addDays(new Date(), days);
    setSelectedDate(newDate);
  }, []);

  const handleMonthSelection = useCallback(() => {
    const newDate = addMonths(new Date(), 1);
    setSelectedDate(newDate);
  }, []);

  const updateTaskContent = useCallback((taskId: string, newContent: string) => {
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === taskId ? { ...task, content: newContent } : task
    ));
  }, []);

  const navItems = [
    { name: 'Inbox', icon: Inbox, emoji: '📥' },
    { name: 'Today', icon: Sun, emoji: '☀️' },
    { name: 'Week', icon: Layers, emoji: '📋' },
    { name: 'Month', icon: CalendarDays, emoji: '🕒' },
    { name: 'Calendar', icon: CalendarIcon, emoji: '📆' },
    { name: 'Someday', icon: CalendarIcon, emoji: '💡' },
  ];

  const sortedTasks = useMemo(() => {
    return tasks
      .filter(task => activeView === 'calendar' ? task.section === 'calendar' : task.section === activeView)
      .sort((a, b) => {
        if (activeView !== 'calendar') return 0;
        if (!a.datetime) return 1;
        if (!b.datetime) return -1;
        return a.datetime.getTime() - b.datetime.getTime();
      });
  }, [tasks, activeView]);

  const todayCalendarTasks = useMemo(() => {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    return tasks
      .filter(task => 
        task.section === 'calendar' && 
        task.datetime && 
        task.datetime >= startOfToday && 
        task.datetime <= endOfToday
      )
      .sort((a, b) => {
        if (!a.datetime || !b.datetime) return 0;
        return a.datetime.getTime() - b.datetime.getTime();
      });
  }, [tasks]);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <div className="flex flex-col bg-[#072146] text-white overflow-hidden" style={{ height: `${windowHeight}px` }}>
        <header className="p-1.5 text-center bg-[#018484]">
          <h1 className="text-sm font-bold text-white">
            GTD Easy - <span className="capitalize">{activeView}</span>
          </h1>
        </header>

        <form onSubmit={handleAddTask} className="px-1.5 py-1 sticky top-0 z-10 bg-[#018484]">
          <div className="flex space-x-1">
            <Input
              type="text"
              placeholder={`Add to ${activeView}`}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-grow bg-white text-[#072146] placeholder-[#072146] border-[#018484] focus:border-[#072146]
              focus:ring-[#072146] text-base h-10"
              ref={inputRef}
            />
            <Button type="submit" size="sm" className="bg-[#072146] hover:bg-[#051835] text-white h-10 w-10 p-0 flex items-center justify-center">
              <PlusCircle className="h-5 w-5" />
              <span className="sr-only">Add task</span>
            </Button>
          </div>
        </form>

        <main ref={mainRef} className="flex-grow p-1.5 overflow-y-auto relative">
          {sortedTasks.length > 0 ? (
            <ul className="space-y-1">
              {sortedTasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  index={index}
                  moveTask={moveTask}
                  handleTaskClick={handleTaskClick}
                  selectedTasks={selectedTasks}
                  toggleTaskCompletion={toggleTaskCompletion}
                  openDateTimeDialog={openDateTimeDialog}
                  moveBulkTasks={moveBulkTasks}
                  moveTaskToSection={moveTaskToSection}
                  duplicateTask={duplicateTask}
                  deleteTask={deleteTask}
                  openMoveToDialog={openMoveToDialog}
                  updateTaskContent={updateTaskContent}
                />
              ))}
            </ul>
          ) : (
            <p className="text-center text-white text-sm">No tasks in {activeView} view</p>
          )}
          {showScrollGuide && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#018484] opacity-50 transition-opacity duration-300" />
          )}
        </main>

        <nav className="bg-[#072146] pt-0.5 pb-3 shadow-lg relative">
          <div className="flex justify-between px-0.5">
            {navItems.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                size="sm"
                className={`flex-1 flex flex-col items-center justify-center py-0.5 px-0.5 rounded-sm transition-all duration-200 ${
                  activeView === item.name.toLowerCase()
                    ? 'bg-[#018484] text-white shadow-md'
                    : 'bg-transparent text-white hover:bg-[#0a3169] hover:text-white'
                }`}
                onClick={() => setActiveView(item.name.toLowerCase())}
                aria-label={item.name}
              >
                <span className="text-2xl">{item.emoji}</span>
              </Button>
            ))}
          </div>
          <Button
            onClick={() => setShowTodayCalendarTasks(true)}
            className="absolute right-2 bottom-[calc(100%+1rem)] flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 bg-[#990001] hover:bg-[#7a0001] text-white shadow-md"
            aria-label="Show today's calendar tasks"
          >
            <span className="text-lg">🗓️</span>
          </Button>
          <Button
            onClick={moveAllTodayTasksToWeek}
            className="absolute left-2 bottom-[calc(100%+1rem)] flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 bg-[#FFCB2D] hover:bg-[#E6B728] text-[#072146] shadow-md"
            aria-label="Move all tasks from Today to Week"
          >
            <ArrowRight className="h-6 w-6" />
          </Button>
        </nav>

        <Dialog open={dateTimeDialogOpen} onOpenChange={setDateTimeDialogOpen}>
          <DialogContent className="bg-[#072146] text-white w-[335px]">
            <DialogHeader>
              <DialogTitle className="text-sm">
                {pendingAction?.action === 'add' ? 'Select date and time for the new task' : 
                 `Select date and time for the task${pendingAction?.taskIds.length > 1 ? 's' : ''}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleDateSelection(1)} 
                  variant="outline" 
                  size="sm"
                  className="h-10 text-xs font-semibold bg-[#018484] text-white border-[#072146] hover:bg-[#016e6e]"
                >
                  Tomorrow
                </Button>
                <Button 
                  onClick={() => handleDateSelection(7)} 
                  variant="outline" 
                  size="sm"
                  className="h-10 text-xs font-semibold bg-[#018484] text-white border-[#072146] hover:bg-[#016e6e]"
                >
                  1 week
                </Button>
                <Button 
                  onClick={() => handleDateSelection(14)}
                  variant="outline" 
                  size="sm"
                  className="h-10 text-xs font-semibold bg-[#018484] text-white border-[#072146] hover:bg-[#016e6e]"
                >
                  2 weeks
                </Button>
                <Button 
                  onClick={handleMonthSelection}
                  variant="outline" 
                  size="sm"
                  className="h-10 text-xs font-semibold bg-[#018484] text-white border-[#072146] hover:bg-[#016e6e]"
                >
                  1 month
                </Button>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                className="bg-[#018484] text-white rounded-md p-1"
              />
              <Select onValueChange={setSelectedTime} value={selectedTime}>
                <SelectTrigger className="bg-[#018484] text-white border-[#072146] h-10 text-sm">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="bg-[#018484] text-white">
                  <ScrollArea className="h-[200px]">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time} className="text-sm">
                        {time}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleDateTimeSelection}
                disabled={!selectedDate || !selectedTime} 
                className="w-full h-12 text-base font-semibold bg-[#018484] hover:bg-[#016e6e] text-white rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus: ring-2 focus:ring-[#016e6e] focus:ring-opacity-50 shadow-lg"
              >
                <Check className="w-5 h-5 mr-2" />
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={moveToDialogOpen} onOpenChange={setMoveToDialogOpen}>
          <DialogContent className="bg-[#072146] text-white p-0 w-[335px]">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="text-lg font-bold">Move to</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 p-4">
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  variant="outline"
                  size="lg"
                  className="h-20 flex flex-col items-center justify-center bg-[#0a3169] hover:bg-[#018484] text-white border-[#072146]"
                  onClick={() => moveBulkTasks(item.name.toLowerCase())}
                >
                  <span className="text-3xl mb-2">{item.emoji}</span>
                  <span className="text-sm">{item.name}</span>
                </Button>
              ))}
              <Button
                variant="outline"
                size="lg"
                className="h-20 flex flex-col items-center justify-center bg-[#018484] hover:bg-[#016e6e] text-white border-[#072146]"
                onClick={() => selectedTasks.forEach(duplicateTask)}
              >
                <Copy className="h-8 w-8 mb-2" />
                <span className="text-sm">Duplicate</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-20 flex flex-col items-center justify-center bg-red-500 hover:bg-red-600 text-white border-[#072146]"
                onClick={() => moveBulkTasks('delete')}
              >
                <Trash2 className="h-8 w-8 mb-2" />
                <span className="text-sm">Delete</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showTodayCalendarTasks} onOpenChange={setShowTodayCalendarTasks}>
          <DialogContent className="bg-[#072146] text-white p-0 w-full max-w-[90%] h-[80vh] max-h-[600px] flex flex-col">
            <DialogHeader className="p-4 bg-[#018484]">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold">Today's Calendar Tasks</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTodayCalendarTasks(false)}
                  className="text-white hover:bg-[#016e6e]"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-grow p-4">
              {todayCalendarTasks.length > 0 ? (
                <ul className="space-y-2">
                  {todayCalendarTasks.map(task => (
                    <li key={task.id} className="flex items-center justify-between p-3 bg-[#0a3169] rounded-md">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTaskCompletion(task.id)}
                          className="h-5 w-5 border-white"
                        />
                        <span className={`text-base ${task.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                          {task.content}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm px-2 py-1 rounded ${
                          isToday(task.datetime) ? 'bg-green-500 text-white' :
                          isFuture(task.datetime) ? 'bg-yellow-500 text-black' :
                          'bg-red-500 text-white'
                        }`}>
                          {task.datetime && format(task.datetime, 'HH:mm')}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDateTimeDialog(task.id)}
                          className="text-white hover:bg-[#018484]"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-lg">No tasks scheduled for today.</p>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}