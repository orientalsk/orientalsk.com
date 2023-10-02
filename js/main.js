var imageData, carou, images = [], selectors = [],
  selectorWidths = 0, warnings = [];

$(function() {
  $(window).bind('resize', function(e) { $.resizeHandler(e); });
  $('img').on('dragstart', function(event) { event.preventDefault(); });
  $('#left').click(function(e) { carou.prevImage(); });
  $('#right').click(function(e) { carou.nextImage(); });
  
  $.loadConfig();
});

$.loadConfig = function() {
  $.ajax({
    url: "config.json",
    dataType: "json",
    type: "GET",
    success: function(data, textStatus, jqXHR)
    {
      if ('success' === textStatus)
      {
        var i;
        imageData = data;
        images = imageData['images']['image'];
        
        carou = new carousel(images, $('#carousel'));
        carou.setInterval(imageData['images']['interval']);
        carou.start();
      }
      else
      {
        alert('Failed to load configuration file. Try again later.');
      }
    },
    error: function(jqXHR, textStatus, errorThrown)
    {
      alert(errorThrown);
    }
  });
};

$.resizeHandler = function(e) {
  var windowWidth = $(window).width();
  var windowHeight = $(window).height();
  var img = $('#carousel').find('div:first');
  
  $('body').width(windowWidth);
  $('body').height(windowHeight);
  
  if (img.length > 0) {
    $(img).width(windowWidth);
    $(img).height(windowHeight);
    $(img).css('background-size', 'cover');
  }
};

function carousel(images, container)
{
  var animationInterval,
    loadedImages = [],
    waitQueue = [],
    currentImage = 0,
    previousImage = images.length - 1,
    interval = 5000,
    paused = true,
    busy = false;
    
  this.images = images;
  this.container = container;
  this.start = start;
  this.reset = reset;
  this.setInterval = setInterval;
  this.nextImage = nextImage;
  this.prevImage = prevImage;
  this.pause = pause;
  this.unpause = unpause;
  this.isPaused = isPaused;
  
  function start()
  {
		if (this.images.length == 0) {
			this.container.children().each(function() {
				$(this).remove();
			});
			
			this.container.html(
				'<div class="error">' +
				'No images available in the current image set.' +
				'</div>'
			);
      
      return;
    }
    
    if (loadedImages.length == 0)
    {
      loadImage(currentImage, start);
      loadImage(previousImage);
    }
    else
    {
      if (!lock(start)) return;
      paused = false;
      unlock();
      
      if (images.length > 1)
        loadImage(currentImage, nextImage);
    }
  }
  
  function reset(imgs)
  {
    if (!lock(function() { reset(imgs); })) return;
    
    window.clearTimeout(animationInterval);
    waitQueue = [];
    
    for (var image in loadedImages)
    {
      loadedImages[image].onload = null;
    }
    
    images = imgs;
    loadedImages = [];
    currentImage = 0;
    previousImage = images.length - 1;
    paused = false;
    
    unlock();
    start();
  }
  
  function nextImage(event)
  {
    if (!lock(nextImage) || (images.length <= 1)) return;
    window.clearTimeout(animationInterval);
    
    var tmpPrevImage = currentImage,
      tmpCurImage = currentImage + 1;
      
    if (images.length === tmpCurImage)
    {
      tmpCurImage = 0;
    }
      
    if (!loadedImages[tmpCurImage])
    {
      unlock();
      loadImage(tmpCurImage, nextImage);
      return;
    }
    
    previousImage = tmpPrevImage;
    currentImage = tmpCurImage;
    
    swapImage(previousImage, currentImage, true);
    
    loadImage(currentImage + 1);
    timeNextImage();
    
    unlock();
  }
  
  function prevImage(event)
  {
    if (!lock(prevImage) || (images.length <= 1)) return;
    window.clearTimeout(animationInterval);
    
    var oldImage = currentImage,
        tmpCurImage = previousImage,
        tmpPreImage = previousImage - 1;
    
    if (tmpPreImage < 0)
      tmpPreImage = images.length - 1;
    
    if (!loadedImages[tmpCurImage])
    {
      unlock();
      loadImage(tmpCurImage, prevImage);
      return;
    }
    
    currentImage = tmpCurImage;
    previousImage = tmpPreImage;
    
    swapImage(oldImage, currentImage, true);
    
    loadImage(previousImage);
    timeNextImage()
    
    unlock();
  }
  
  function timeNextImage()
  {
    if (!paused)
    {
      animationInterval =
        window.setTimeout(nextImage, interval);
    }
  }
  
  function pause()
  {
    window.clearTimeout(animationInterval);
    busy = true;
    waitQueue = [];
    paused = true;
    busy = false;
  }
  
  function unpause()
  {
    paused = false;
    busy = false;
    nextImage();
  }
  
  function isPaused()
  {
    return paused;
  }
  
  function setInterval(inter)
  {
    inter = parseInt(inter);
    
    if (!isNaN(inter) && (inter > 0))
    {
      window.clearTimeout(animationInterval);
      interval = inter;
      timeNextImage();
    }
  }
      
  function loadImage(index, callback)
  {
    if ((index >= images.length) || (loadedImages[index] !== undefined))
    {
      if (callback)
        callback();
      return;
    }
    
    var img = new Image();
    
    $(img).bind('load',  function(data) { imageLoaded(data, index, callback); });
    $(img).bind('error', function(data) {
      var msg = 'Failed to load image: ' + data.target.src;
      alert(msg);
      
      images.splice(index, 1);
      previousImage -= 1;
      
      if (previousImage < 0)
        previousImage = images.length - 1;
          
      if (callback) { callback(); }
    });
    
    img.src = imageData['images']['directory'] + images[index]['src'];
    img.alt = images[index]['text'];
  }
  
  function imageLoaded(data, index, callback)
  {
    if (data.target)
    {
      loadedImages[index] = data.target;
      
      if (callback)
      {
        callback();
      }
    }
  }
  
  function lock(callback)
  {
    if (busy)
    {
      waitQueue.push(callback);
      return false;
    }
    
    busy = true;
    return true;
  }
  
  function unlock()
  {
    if (busy)
    {
      busy = false;
    }
    
    var callback;
    
    if (waitQueue.length > 0)
    {
      callback = waitQueue[0];
      waitQueue.splice(0, 1);
    }
      
    if (callback)
      callback();
  }
  
  function swapImage(source, destination, locked)
  {
    if (!locked)
      if (!lock(function() { swapImage(source, destination, false); })) return;
    
    var newImg = destination;
    var position = 'center top';
    var first = false;
    var div = document.createElement('div');
    var imgDiv = document.createElement('div');
    var txtDiv = document.createElement('div');
    
    if ($('#loading').length > 0) {
      newImg = source;
      first = true;
    }
    
    if (images[newImg].position) {
      position = images[newImg].position;
    }
    
    txtDiv.innerHTML = loadedImages[newImg].alt;
    
    div.appendChild(imgDiv);
    div.appendChild(txtDiv);
    
    if (first) {
      container.append(div);
      
      $(imgDiv).css({
        "width": "100%",
        "height": "100%",
        "background-image": "url('" + loadedImages[newImg].src + "')",
        "background-position": position,
        "background-repeat": "no-repeat",
        "background-size": "cover"
      });
      
      $.resizeHandler();
      
      $('#loading').fadeOut('fast', function() {
        $('#left').fadeIn('slow');
        $('#right').fadeIn('slow');
        container.fadeIn('slow');
        
        currentImage -= 1;
        previousImage += 1;
        
        $('#loading').remove();
      });
    } else {
      $(container.find('div div:first')).css({
        'background-image': "url('" + loadedImages[newImg].src + "')",
        'background-position': position
      });
      
      $(container.find('div div:last')).html(images[newImg].text);
    }
    
    unlock();
  }
}
