import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Loader2, RefreshCw, ChevronUp, ChevronDown, LayoutTemplate, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

interface PresentationViewerProps {
  agentSlides?: any[];
  currentConversationId?: string;
  userId?: string | null;
}

export interface PresentationViewerRef {
  downloadSlidesAsPDF: () => void;
}

const PresentationViewer = React.forwardRef<PresentationViewerRef, PresentationViewerProps>(({
  agentSlides,
  currentConversationId,
  userId
}, ref) => {
  const { addToast } = useToast();
  
  // State for slide images
  const [slideImages, setSlideImages] = useState<Record<string, {
    loading: boolean;
    imageData?: string;
    error?: string;
  }>>({});
  
  // State for prompt editing
  const [editingPrompts, setEditingPrompts] = useState<Record<string, boolean>>({});
  const [promptVersions, setPromptVersions] = useState<Record<string, string[]>>({});
  const [currentPrompts, setCurrentPrompts] = useState<Record<string, string>>({});
  const [selectedVersions, setSelectedVersions] = useState<Record<string, number>>({});
  
  // Cache for database checks to avoid repeated calls
  const dbCheckCacheRef = useRef<Map<string, any>>(new Map());
  
  // Track which slides we've already started generating by PROMPT (not just slideKey)
  const generatingPromptsRef = useRef<Set<string>>(new Set());
  
  // Track which slides we've already started generating by slideKey
  const generatingRef = useRef<Set<string>>(new Set());
  
  // Track previous slides to detect changes
  const prevSlidesRef = useRef<any[]>([]);
  
  // Track if we're currently loading to prevent duplicate calls
  const isLoadingImagesRef = useRef(false);
  const lastLoadKeyRef = useRef<string>('');
  
  // Track generation queue to add delays
  const generationQueueRef = useRef<Array<{slideKey: string, slide: any, index: number, delay: number}>>([]);
  const isProcessingQueueRef = useRef(false);
  
  // Reset component state when conversation changes
  useEffect(() => {
    console.log('[PresentationViewer] Conversation changed, resetting state');
    
    // Clear all state
    setSlideImages({});
    setEditingPrompts({});
    setPromptVersions({});
    setCurrentPrompts({});
    setSelectedVersions({});
    
    // Clear all refs
    dbCheckCacheRef.current.clear();
    generatingPromptsRef.current.clear();
    generatingRef.current.clear();
    prevSlidesRef.current = [];
    isLoadingImagesRef.current = false;
    lastLoadKeyRef.current = '';
    generationQueueRef.current = [];
    isProcessingQueueRef.current = false;
  }, [currentConversationId]);
  
  // Process generation queue with delays
  const processGenerationQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || generationQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingQueueRef.current = true;
    console.log(`🎬 Processing generation queue with ${generationQueueRef.current.length} items`);
    
    while (generationQueueRef.current.length > 0) {
      const item = generationQueueRef.current.shift();
      if (!item) break;
      
      const { slideKey, slide, index, delay } = item;
      
      // Double-check we still need to generate this
      const promptKey = slide.imagePrompt;
      if (generatingPromptsRef.current.has(promptKey)) {
        console.log(`⏭️ Skipping ${slideKey} - prompt already being generated`);
        continue;
      }
      
      console.log(`⏳ Waiting ${delay}ms before generating ${slideKey}`);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Mark this prompt as being generated
      generatingPromptsRef.current.add(promptKey);
      generatingRef.current.add(slideKey);
      
      console.log(`🚀 Starting generation for ${slideKey} with prompt: ${promptKey.substring(0, 50)}...`);
      generateSlideImage(slide, index);
    }
    
    isProcessingQueueRef.current = false;
  }, []);

  // Memoized function to extract prompt versions from saved images
  const extractPromptVersionsFromImages = useCallback((savedImages: any[]) => {
    const versionsBySlide: Record<string, string[]> = {};
    const selectedVersionsBySlide: Record<string, number> = {};
    
    // Group images by slide_id and extract unique prompts
    savedImages.forEach((image) => {
      const slideId = image.slide_id;
      if (!versionsBySlide[slideId]) {
        versionsBySlide[slideId] = [];
      }
      
      // Add unique prompts
      if (image.image_prompt && !versionsBySlide[slideId].includes(image.image_prompt)) {
        versionsBySlide[slideId].push(image.image_prompt);
      }
    });
    
    // Set default selected version (0) for each slide
    Object.keys(versionsBySlide).forEach(slideId => {
      selectedVersionsBySlide[slideId] = 0;
    });
    
    return { versionsBySlide, selectedVersionsBySlide };
  }, []);

  // Function to save a new prompt version
  const savePromptVersion = useCallback(async (slideKey: string, prompt: string) => {
    setPromptVersions(prev => {
      const existing = prev[slideKey] || [];
      if (!existing.includes(prompt)) {
        return {
          ...prev,
          [slideKey]: [...existing, prompt]
        };
      }
      return prev;
    });
  }, []);

  // Function to check database for existing image (immediate, no delays)
  const checkDatabaseForImage = useCallback(async (slide: any, index: number) => {
    const slideKey = slide.id || `slide-${index}`;
    const cacheKey = `${currentConversationId || 'no-session'}-${slide.imagePrompt || 'no-prompt'}`;
    
    // Check cache first
    if (dbCheckCacheRef.current.has(cacheKey)) {
      const cachedResult = dbCheckCacheRef.current.get(cacheKey);
      console.log(`💾 Using cached database result for slide ${index + 1}`);
      
      if (cachedResult) {
        setSlideImages(prev => ({
          ...prev,
          [slideKey]: {
            loading: false,
            imageData: `data:${cachedResult.image_mime_type};base64,${cachedResult.image_data}`
          }
        }));
        return true; // Found in database
      }
      return false; // Not found (cached null result)
    }
    
    // Not in cache, check database immediately
    try {
      console.log(`🔍 Checking database for slide ${index + 1} with prompt: ${slide.imagePrompt.substring(0, 50)}...`);
      
      const params = new URLSearchParams();
      params.append('imagePrompt', slide.imagePrompt);
      if (currentConversationId) params.append('sessionId', currentConversationId);
      if (userId) params.append('userId', userId);
      
      const checkResponse = await fetch(`/api/presentations/save-slide-image?${params.toString()}`);
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        const existingImages = checkData.slideImages || [];
        
        console.log(`🔍 Database check for slide ${index + 1}: found ${existingImages.length} existing images`);
        
        // Look for an existing image with the EXACT same prompt and session
        const existingImage = existingImages.find((img: any) => 
          img.image_prompt === slide.imagePrompt &&
          img.session_id === currentConversationId
        );
        
        // Cache the result (either the image or null)
        dbCheckCacheRef.current.set(cacheKey, existingImage || null);
        
        if (existingImage) {
          console.log(`✅ Found exact match for slide ${index + 1}, loading from database`);
          setSlideImages(prev => ({
            ...prev,
            [slideKey]: {
              loading: false,
              imageData: `data:${existingImage.image_mime_type};base64,${existingImage.image_data}`
            }
          }));
          return true; // Found in database
        }
      } else {
        console.log(`⚠️ Database check failed for slide ${index + 1}, will generate new image`);
        dbCheckCacheRef.current.set(cacheKey, null);
      }
    } catch (checkError) {
      console.error(`❌ Error checking for existing image for slide ${index + 1}:`, checkError);
      dbCheckCacheRef.current.set(cacheKey, null);
    }
    
    return false; // Not found in database
  }, [currentConversationId, userId]);

  // Function to generate image for a single slide (only called when NOT in database)
  const generateSlideImage = useCallback(async (slide: any, index: number, isRetry = false) => {
    const slideKey = slide.id || `slide-${index}`;
    
    console.log(`🎨 generateSlideImage called for slide ${index + 1} (${slideKey}):`, {
      slideTitle: slide.title,
      hasImagePrompt: !!slide.imagePrompt,
      imagePrompt: slide.imagePrompt?.substring(0, 100) + '...',
      isRetry
    });
    
    // If not a retry, check database first (immediate check)
    if (!isRetry && (currentConversationId || userId) && slide.imagePrompt) {
      const foundInDb = await checkDatabaseForImage(slide, index);
      if (foundInDb) {
        return; // Found in database, no need to generate
      }
    }
    
    // Set loading state
    console.log(`⏳ Setting loading state for slide ${index + 1} (${slideKey})`);
    setSlideImages(prev => ({
      ...prev,
      [slideKey]: { loading: true }
    }));

    try {
      const response = await fetch('/api/presentations/generate-slide-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imagePrompt: slide.imagePrompt
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded. ${errorData.details || 'Please wait before generating more slides.'}`);
        }
        
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      const imageDataUrl = `data:${data.image.mimeType};base64,${data.image.base64}`;
      
      // Save image to database - ALWAYS save as new version, don't overwrite
      try {
        const saveResponse = await fetch('/api/presentations/save-slide-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slideId: `${index + 1}`, // Use consistent slide ID based on position, not slideKey
            slideNumber: index + 1,
            sessionId: currentConversationId,
            userId: userId,
            title: slide.title || `Slide ${index + 1}`,
            imagePrompt: slide.imagePrompt,
            imageData: data.image.base64,
            imageMimeType: data.image.mimeType,
            imageWidth: data.image.width,
            imageHeight: data.image.height,
            backgroundColor: slide.backgroundColor,
            style: slide.style,
            transition: slide.transition,
            provider: data.provider || 'gemini',
            generationMetadata: {
              generatedAt: new Date().toISOString(),
              isRetry,
              isNewVersion: true, // Mark this as potentially a new version
              originalFormat: data.originalFormat, // Track original format before WebP conversion
              originalSlideData: {
                id: slide.id,
                title: slide.title,
                backgroundColor: slide.backgroundColor,
                style: slide.style,
                transition: slide.transition
              }
            }
          }),
        });

        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          console.log(`✅ Slide image saved to database:`, {
            slideId: `${index + 1}`,
            slideNumber: index + 1,
            dbId: saveData.slideImage?.id
          });
          
          // Update prompt versions immediately after saving
          const actualSlideId = `${index + 1}`;
          setPromptVersions(prev => {
            const existing = prev[actualSlideId] || [];
            if (!existing.includes(slide.imagePrompt)) {
              return {
                ...prev,
                [actualSlideId]: [...existing, slide.imagePrompt]
              };
            }
            return prev;
          });
          
          // Update selected version to the new one
          setSelectedVersions(prev => {
            const existingVersions = promptVersions[actualSlideId] || [];
            const newVersionIndex = existingVersions.length; // New version is at the end
            return {
              ...prev,
              [actualSlideId]: newVersionIndex
            };
          });
          
          // Cache the result
          const cacheKey = `${currentConversationId || 'no-session'}-${slide.imagePrompt}`;
          dbCheckCacheRef.current.set(cacheKey, saveData.slideImage);
        } else {
          console.error('Failed to save slide image to database:', await saveResponse.text());
        }
      } catch (saveError) {
        console.error('Error saving slide image to database:', saveError);
        // Don't fail the image generation if database save fails
      }
      
      // Update with the generated image
      console.log(`✅ Image generated successfully for slide ${index + 1} (${slideKey})`);
      setSlideImages(prev => ({
        ...prev,
        [slideKey]: {
          loading: false,
          imageData: imageDataUrl
        }
      }));
    } catch (error) {
      console.error(`Error generating image for slide ${index + 1}:`, error);
      setSlideImages(prev => ({
        ...prev,
        [slideKey]: {
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to generate image'
        }
      }));
    } finally {
      // Clean up tracking - remove from both sets
      const promptKey = slide.imagePrompt;
      generatingPromptsRef.current.delete(promptKey);
      generatingRef.current.delete(slideKey);
      console.log(`🧹 Cleaned up tracking for slide ${index + 1} (${slideKey}) and prompt`);
    }
  }, [currentConversationId, userId, promptVersions]);

  // Function to download all slides as PDF
  const downloadSlidesAsPDF = useCallback(async () => {
    if (!agentSlides || agentSlides.length === 0) {
      addToast({
        title: "No slides available",
        message: "Please generate some slides first before downloading.",
        type: "error"
      });
      return;
    }

    // Check if all slides have generated images
    const slidesWithImages = agentSlides.filter((slide, index) => {
      const slideKey = slide.id || `slide-${index}`;
      const imageState = slideImages[slideKey];
      return imageState?.imageData;
    });

    if (slidesWithImages.length === 0) {
      addToast({
        title: "No slide images available",
        message: "Please wait for slide images to be generated before downloading.",
        type: "error"
      });
      return;
    }

    if (slidesWithImages.length < agentSlides.length) {
      addToast({
        title: "Some slides still generating",
        message: `${slidesWithImages.length} of ${agentSlides.length} slides will be included in the PDF.`,
        type: "warning"
      });
    }

    try {
      // Import jsPDF dynamically to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      
      // Create new PDF document in landscape mode for better slide display
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      let isFirstPage = true;

      for (let i = 0; i < agentSlides.length; i++) {
        const slide = agentSlides[i];
        const slideKey = slide.id || `slide-${i}`;
        const imageState = slideImages[slideKey];

        // Skip slides without images
        if (!imageState?.imageData) continue;

        // Add new page for each slide except the first
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        try {
          // Add the slide image (full page, no title)
          const imageData = imageState.imageData;
          
          // Calculate dimensions to fit the entire page while maintaining aspect ratio
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          // Assuming 3:2 aspect ratio for slides
          const aspectRatio = 3 / 2;
          let imgWidth = pageWidth;
          let imgHeight = imgWidth / aspectRatio;
          
          // If image is too tall, scale down to fit page height
          if (imgHeight > pageHeight) {
            imgHeight = pageHeight;
            imgWidth = imgHeight * aspectRatio;
          }
          
          // Center the image on the page
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;
          
          pdf.addImage(imageData, 'JPEG', x, y, imgWidth, imgHeight);
        } catch (imgError) {
          console.error(`Failed to add image for slide ${i + 1}:`, imgError);
          // Skip this slide if image fails to load
        }
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `presentation-slides-${timestamp}.pdf`;

      // Download the PDF
      pdf.save(filename);

      addToast({
        title: "PDF Downloaded",
        message: `Successfully downloaded ${slidesWithImages.length} slides as ${filename}`,
        type: "success"
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      addToast({
        title: "PDF Generation Failed",
        message: "Failed to generate PDF. Please try again.",
        type: "error"
      });
    }
  }, [agentSlides, slideImages, addToast]);

  // Function to regenerate slide with new prompt
  const regenerateSlideWithPrompt = useCallback(async (slideIndex: number, newPrompt: string) => {
    const slide = agentSlides?.[slideIndex];
    if (!slide) return;
    
    const slideKey = slide.id || `slide-${slideIndex}`;
    
    // Update current prompt
    setCurrentPrompts(prev => ({
      ...prev,
      [slideKey]: newPrompt
    }));
    
    // Save this prompt version
    await savePromptVersion(slideKey, newPrompt);
    
    // Clear existing image and cache
    setSlideImages(prev => {
      const updated = { ...prev };
      delete updated[slideKey];
      return updated;
    });
    
    // Clear database cache for this prompt
    const cacheKey = `${currentConversationId || 'no-session'}-${newPrompt}`;
    dbCheckCacheRef.current.delete(cacheKey);
    
    // Remove from generation tracking
    generatingRef.current.delete(slideKey);
    
    // Create updated slide with new prompt
    const updatedSlide = {
      ...slide,
      imagePrompt: newPrompt
    };
    
    // Trigger regeneration
    generatingRef.current.add(slideKey);
    await generateSlideImage(updatedSlide, slideIndex);
    
    console.log(`🔄 Regenerating slide ${slideIndex + 1} with new prompt`);
  }, [agentSlides, currentConversationId, savePromptVersion, generateSlideImage, checkDatabaseForImage]);

  // Function to switch to a different prompt version
  const switchPromptVersion = useCallback(async (slideIndex: number, versionIndex: number) => {
    const slide = agentSlides?.[slideIndex];
    if (!slide) return;
    
    const slideKey = slide.id || `slide-${slideIndex}`;
    const versions = promptVersions[slideKey] || [];
    const selectedPrompt = versions[versionIndex];
    
    if (!selectedPrompt) return;
    
    console.log(`🔄 Switching to version ${versionIndex + 1} for slide ${slideIndex + 1}`);
    
    setSelectedVersions(prev => ({
      ...prev,
      [slideKey]: versionIndex
    }));
    
    setCurrentPrompts(prev => ({
      ...prev,
      [slideKey]: selectedPrompt
    }));
    
    // Check if we have a cached image for this prompt
    const cacheKey = `${currentConversationId || 'no-session'}-${selectedPrompt}`;
    const cachedResult = dbCheckCacheRef.current.get(cacheKey);
    
    if (cachedResult) {
      // Load cached image immediately
      setSlideImages(prev => ({
        ...prev,
        [slideKey]: {
          loading: false,
          imageData: `data:${cachedResult.image_mime_type};base64,${cachedResult.image_data}`
        }
      }));
      console.log(`✅ Switched to cached version ${versionIndex + 1} for slide ${slideIndex + 1}`);
    } else {
      // Set loading state while we fetch from database
      setSlideImages(prev => ({
        ...prev,
        [slideKey]: { loading: true }
      }));
      
      try {
        // Try to load from database
        const params = new URLSearchParams();
        params.append('imagePrompt', selectedPrompt);
        params.append('slideId', slideKey);
        if (currentConversationId) params.append('sessionId', currentConversationId);
        if (userId) params.append('userId', userId);
        
        const response = await fetch(`/api/presentations/save-slide-image?${params.toString()}`);
        
        if (response.ok) {
          const data = await response.json();
          const savedImages = data.slideImages || [];
          const matchingImage = savedImages.find((img: any) => 
            img.image_prompt === selectedPrompt && img.slide_id === slideKey
          );
          
          if (matchingImage) {
            // Cache and display the image
            dbCheckCacheRef.current.set(cacheKey, matchingImage);
            setSlideImages(prev => ({
              ...prev,
              [slideKey]: {
                loading: false,
                imageData: `data:${matchingImage.image_mime_type};base64,${matchingImage.image_data}`
              }
            }));
            console.log(`✅ Loaded version ${versionIndex + 1} from database for slide ${slideIndex + 1}`);
          } else {
            throw new Error('Image not found in database');
          }
        } else {
          throw new Error('Failed to fetch from database');
        }
      } catch (error) {
        console.error('Error switching prompt version:', error);
        setSlideImages(prev => ({
          ...prev,
          [slideKey]: {
            loading: false,
            error: 'Failed to load version'
          }
        }));
      }
    }
  }, [agentSlides, promptVersions, currentConversationId, userId]);

  // Function to load saved images from database
  const loadSavedImages = useCallback(async () => {
    if (!currentConversationId && !userId) return;
    
    try {
      console.log(`📁 Loading all saved slide images for session: ${currentConversationId}`);
      
      const params = new URLSearchParams();
      if (currentConversationId) params.append('sessionId', currentConversationId);
      if (userId) params.append('userId', userId);
      
      const response = await fetch(`/api/presentations/save-slide-image?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        const savedImages = data.slideImages || [];
        
        console.log(`📁 Found ${savedImages.length} saved slide images in database`);
        
        // Convert saved images to the format expected by slideImages state
        const imageMap: Record<string, { loading: boolean; imageData?: string; error?: string }> = {};
        
        // Always load all saved images first by their original slide IDs
        savedImages.forEach((savedImage: any) => {
          const slideKey = savedImage.slide_id;
          imageMap[slideKey] = {
            loading: false,
            imageData: `data:${savedImage.image_mime_type};base64,${savedImage.image_data}`
          };
          console.log(`📥 Loaded saved image for slide ID: ${slideKey}`);
        });
        
        // Additionally, if we have current slides, also try to match by prompt for any missing images
        if (agentSlides && agentSlides.length > 0) {
          agentSlides.forEach((slide, index) => {
            const slideKey = slide.id || `slide-${index}`;
            
            // Only try to match if we don't already have an image for this slide key
            if (!imageMap[slideKey]) {
              // Find saved image that matches this slide's prompt
              const matchingImage = savedImages.find((savedImage: any) => 
                savedImage.image_prompt === slide.imagePrompt &&
                savedImage.session_id === currentConversationId
              );
              
              if (matchingImage) {
                // Add to slideImages state using current slide key
                imageMap[slideKey] = {
                  loading: false,
                  imageData: `data:${matchingImage.image_mime_type};base64,${matchingImage.image_data}`
                };
                
                console.log(`🔗 Additionally matched slide ${index + 1} (${slideKey}) with saved image by prompt`);
              }
            }
          });
        }
        
        // Extract prompt versions from all saved images at once
        const { versionsBySlide, selectedVersionsBySlide } = extractPromptVersionsFromImages(savedImages);
        
        // Populate the database cache with all loaded images
        savedImages.forEach((savedImage: any) => {
          if (savedImage.image_prompt) {
            const cacheKey = `${currentConversationId || 'no-session'}-${savedImage.image_prompt}`;
            dbCheckCacheRef.current.set(cacheKey, savedImage);
          }
        });
        
        // Update all states at once
        setPromptVersions(versionsBySlide);
        setSelectedVersions(prev => ({
          ...prev,
          ...selectedVersionsBySlide
        }));
        
        // Merge with existing slideImages state instead of replacing
        setSlideImages(prev => {
          const merged = { ...prev, ...imageMap };
          console.log(`🔄 Merged ${Object.keys(imageMap).length} loaded images with ${Object.keys(prev).length} existing images. Total: ${Object.keys(merged).length}`);
          return merged;
        });
        
        console.log(`✅ Loaded ${savedImages.length} images with ${Object.keys(versionsBySlide).length} slides having versions`);
      } else {
        console.log(`⚠️ Failed to load saved images: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading saved slide images:', error);
    }
  }, [currentConversationId, userId, agentSlides, extractPromptVersionsFromImages]);

  // Clear generation tracking when component unmounts
  useEffect(() => {
    return () => {
      generatingRef.current.clear();
      dbCheckCacheRef.current.clear();
    };
  }, []);

  // Load saved images when component mounts or session changes
  useEffect(() => {
    if (currentConversationId || userId) {
      // Create a unique key for this load condition
      const loadKey = `${currentConversationId}-${userId}-${agentSlides?.length || 0}`;
      
      // Only load if conditions have changed
      if (loadKey !== lastLoadKeyRef.current) {
        lastLoadKeyRef.current = loadKey;
        
        // Prevent concurrent loads
        if (!isLoadingImagesRef.current) {
          isLoadingImagesRef.current = true;
          console.log('📥 Loading saved images (conditions changed)');
          loadSavedImages().finally(() => {
            isLoadingImagesRef.current = false;
          });
        }
      }
    }
  }, [currentConversationId, userId, agentSlides?.length, loadSavedImages]);

  // Clear slide images and regenerate ONLY for changed slides
  useEffect(() => {
    if (agentSlides && agentSlides.length > 0) {
      const prevSlides = prevSlidesRef.current;
      
      // Check each slide for changes
      agentSlides.forEach((slide, index) => {
        const slideKey = slide.id || `slide-${index}`;
        const prevSlide = prevSlides[index];
        
        // Check if this specific slide has changed
        const hasChanged = !prevSlide || 
          prevSlide.imagePrompt !== slide.imagePrompt ||
          prevSlide.title !== slide.title ||
          prevSlide.backgroundColor !== slide.backgroundColor ||
          prevSlide.style !== slide.style;
        
        if (hasChanged) {
          console.log(`Slide ${index + 1} has changed, clearing image for regeneration`);
          // Clear only this slide's image
          setSlideImages(prev => {
            const updated = { ...prev };
            delete updated[slideKey];
            return updated;
          });
          // Remove from generation tracking so it can be regenerated
          generatingRef.current.delete(slideKey);
          
          // Clear database cache for this slide's prompt
          if (slide.imagePrompt) {
            const cacheKey = `${currentConversationId || 'no-session'}-${slide.imagePrompt}`;
            dbCheckCacheRef.current.delete(cacheKey);
          }
        }
      });
      
      // Update the previous slides reference
      prevSlidesRef.current = [...agentSlides];
    }
  }, [agentSlides, currentConversationId]);

  // Trigger image generation when slides appear with rate limiting
  useEffect(() => {
    if (agentSlides && agentSlides.length > 0) {
      console.log(`🎯 Checking ${agentSlides.length} slides for image generation...`);
      
      // First, immediately check database for all slides (no delays)
      const checkAllSlidesInDatabase = async () => {
        let queueChanged = false;
        const slidesToGenerate: Array<{slideKey: string, slide: any, index: number}> = [];
        
        for (let index = 0; index < agentSlides.length; index++) {
          const slide: any = agentSlides[index];
          const slideKey = slide.id || `slide-${index}`;
          const promptKey = slide.imagePrompt;
          
          if (!promptKey) {
            console.log(`⏭️ Skipping slide ${index + 1} - no image prompt`);
            continue;
          }
          
          // Check if we need to process this slide
          const alreadyGeneratingSlide = generatingRef.current.has(slideKey);
          const alreadyGeneratingPrompt = generatingPromptsRef.current.has(promptKey);
          const alreadyInQueue = generationQueueRef.current.some(item => 
            item.slideKey === slideKey || item.slide.imagePrompt === promptKey
          );
          const hasExistingImage = slideImages[slideKey]?.imageData;
          const isLoading = slideImages[slideKey]?.loading;
          
          console.log(`🔍 Slide ${index + 1} (${slideKey}):`, {
            hasImagePrompt: !!promptKey,
            hasExistingImage,
            isLoading,
            alreadyGeneratingSlide,
            alreadyGeneratingPrompt,
            alreadyInQueue,
            promptPreview: promptKey.substring(0, 50) + '...'
          });
          
          const needsProcessing = !hasExistingImage && 
                                 !isLoading && 
                                 !alreadyGeneratingSlide && 
                                 !alreadyGeneratingPrompt && 
                                 !alreadyInQueue;
          
          if (needsProcessing) {
            // Check database immediately (no delay) - this will set the image if found
            const foundInDb = await checkDatabaseForImage(slide, index);
            
            // If not found in database, add to generation queue
            if (!foundInDb) {
              slidesToGenerate.push({ slideKey, slide, index });
            }
          }
        }
        
        // Now add slides that need generation to the queue with delays
        slidesToGenerate.forEach(({ slideKey, slide, index }, queueIndex) => {
          const delay = queueIndex * 3000; // 3 second delay between each slide generation
          console.log(`📋 Adding slide ${index + 1} to generation queue with ${delay}ms delay (queue position: ${queueIndex + 1})`);
          
          generationQueueRef.current.push({
            slideKey,
            slide,
            index,
            delay
          });
          queueChanged = true;
        });
        
        // Process the queue if we added new items
        if (queueChanged) {
          console.log(`🎬 Queue changed, processing ${generationQueueRef.current.length} items`);
          processGenerationQueue();
        }
      };
      
      checkAllSlidesInDatabase();
    }
  }, [agentSlides, checkDatabaseForImage, processGenerationQueue]);

  // Expose the download function through ref
  React.useImperativeHandle(ref, () => ({
    downloadSlidesAsPDF
  }), [downloadSlidesAsPDF]);

  return (
    <div className="h-full overflow-auto bg-white">
      {agentSlides && agentSlides.length > 0 ? (
        <div className="space-y-4 p-4">
          {agentSlides.map((slide, index) => {
            const slideKey = slide.id || `slide-${index}`;
            const imageState = slideImages[slideKey];
            
            if (imageState?.loading) {
              // Loading state with pulsating overlay
              return (
                <div 
                  key={slideKey}
                  className="w-full relative rounded-lg overflow-hidden"
                  style={{ aspectRatio: '3/2' }}
                >
                  {/* Base slide content */}
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: slide.backgroundColor || '#2c3e50',
                      color: 'white'
                    }}
                  >
                    <div className="text-center">
                      <h4 className="text-2xl font-bold">{slide.title || 'No Title'}</h4>
                      <p className="text-sm opacity-80 mt-2">Please wait while we are generating slide</p>
                    </div>
                  </div>
                  
                  {/* Pulsating overlay */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: 'rgba(35, 35, 35, 0.6)',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }}
                  >
                  </div>
                </div>
              );
            } else if (imageState?.error) {
              // Error state
              return (
                <div 
                  key={slideKey}
                  className="w-full flex items-center justify-center rounded-lg"
                  style={{ 
                    aspectRatio: '3/2',
                    backgroundColor: '#fee',
                    color: '#c00'
                  }}
                >
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2">Failed to generate image</p>
                    <p className="text-xs opacity-80 mb-3">{imageState.error}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        generatingRef.current.delete(slideKey);
                        generatingRef.current.add(slideKey);
                        generateSlideImage(slide, index, true);
                      }}
                      className="border-red-300 hover:bg-red-50"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                </div>
              );
            } else if (imageState?.imageData) {
              // Success state - show generated image with version switcher if multiple versions exist
              const versions = promptVersions[slideKey] || [];
              const hasMultipleVersions = versions.length > 1;
              const currentVersionIndex = selectedVersions[slideKey] || 0;
              
              return (
                <div key={slideKey} className="relative">
                  <img 
                    src={imageState.imageData}
                    alt={slide.title || `Slide ${index + 1}`}
                    className="w-full object-cover rounded-lg"
                    style={{ aspectRatio: '3/2' }}
                  />
                  
                  {/* Version switcher - only show if multiple versions exist */}
                  {hasMultipleVersions && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#232323]/70 rounded-lg p-1">
                      <button
                        onClick={() => {
                          const prevIndex = currentVersionIndex > 0 ? currentVersionIndex - 1 : versions.length - 1;
                          switchPromptVersion(index, prevIndex);
                        }}
                        className="p-1 text-white hover:bg-white/20 rounded transition-colors"
                        title="Previous version"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      
                      <span className="text-white text-xs px-1 min-w-[20px] text-center">
                        {currentVersionIndex + 1}/{versions.length}
                      </span>
                      
                      <button
                        onClick={() => {
                          const nextIndex = currentVersionIndex < versions.length - 1 ? currentVersionIndex + 1 : 0;
                          switchPromptVersion(index, nextIndex);
                        }}
                        className="p-1 text-white hover:bg-white/20 rounded transition-colors"
                        title="Next version"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            } else {
              // Default state - show title with pulsating overlay loader
              return (
                <div 
                  key={slideKey}
                  className="w-full relative rounded-lg overflow-hidden"
                  style={{ aspectRatio: '3/2' }}
                >
                  {/* Base slide content */}
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: slide.backgroundColor || '#2c3e50',
                      color: 'white'
                    }}
                  >
                    <div className="text-center">
                      <h4 className="text-2xl font-bold">{slide.title || 'No Title'}</h4>
                      <p className="text-sm opacity-80 mt-2">Please wait while we are generating slide</p>
                    </div>
                  </div>
                  
                                    {/* Pulsating overlay */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: 'rgba(35, 35, 35, 0.6)',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }}
                  >
                  </div>
                </div>
              );
            }
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <LayoutTemplate className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No slides available</p>
            <p className="text-sm text-gray-400 mt-1">Create slides using the Presentation Creator Agent</p>
          </div>
        </div>
      )}
    </div>
  );
});

PresentationViewer.displayName = 'PresentationViewer';

export default PresentationViewer; 