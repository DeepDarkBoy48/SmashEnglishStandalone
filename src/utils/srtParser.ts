export interface SubtitleItem {
  id: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

/**
 * Parses a time string (HH:MM:SS,mmm) into seconds
 */
const parseTime = (timeString: string): number => {
  if (!timeString) return 0;
  
  const [time, ms] = timeString.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  
  return (hours * 3600) + (minutes * 60) + seconds + (parseInt(ms) / 1000);
};

/**
 * Parses SRT content into structured subtitle items
 */
export const parseSRT = (content: string): SubtitleItem[] => {
  // Normalize line endings and split by double newlines
  const entries = content.replace(/\r\n/g, '\n').trim().split('\n\n');
  
  const subtitles: SubtitleItem[] = [];
  
  entries.forEach((entry) => {
    const lines = entry.split('\n');
    
    // Minimum valid entry is ID, timestamp, and text
    if (lines.length < 3) return;
    
    const id = parseInt(lines[0]);
    if (isNaN(id)) return;
    
    const timeLine = lines[1];
    if (!timeLine.includes('-->')) return;
    
    const [startStr, endStr] = timeLine.split(' --> ');
    const startTime = parseTime(startStr);
    const endTime = parseTime(endStr);
    
    // Join remaining lines as text
    const text = lines.slice(2).join('\n');
    
    subtitles.push({
      id,
      startTime,
      endTime,
      text
    });
  });
  
  return subtitles;
};
