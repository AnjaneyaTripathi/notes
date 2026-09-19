(function () {
  'use strict';

  function slugify(value) {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-') || 'section';
  }

  function addStableIds(headings) {
    var ids = new Set(Array.prototype.map.call(document.querySelectorAll('[id]'), function (element) {
      return element.id;
    }));

    headings.forEach(function (heading) {
      if (heading.id) {
        return;
      }

      var base = slugify(heading.textContent);
      var candidate = base;
      var index = 2;
      while (ids.has(candidate)) {
        candidate = base + '-' + index;
        index += 1;
      }
      heading.id = candidate;
      ids.add(candidate);
    });
  }

  function addSectionNumbers(headings, post) {
    var postTitle = post.querySelector('.post-title');
    var hasDuplicateRoot = postTitle && headings.some(function (heading) {
      return heading.tagName === 'H2' && heading.textContent.trim() === postTitle.textContent.trim();
    });
    var primaryLevel = hasDuplicateRoot ? 3 : 2;
    var index = 0;

    headings.forEach(function (heading) {
      heading.dataset.tocText = heading.textContent.trim();
      if (Number(heading.tagName.slice(1)) !== primaryLevel) {
        return;
      }

      index += 1;
      var number = String(index).padStart(2, '0');
      heading.dataset.sectionNumber = number;
      heading.classList.add('section-heading--numbered');

      var marker = document.createElement('span');
      marker.className = 'section-number';
      marker.setAttribute('aria-hidden', 'true');
      marker.textContent = number;
      heading.insertBefore(marker, heading.firstChild);
    });
  }

  function buildToc(content, panel) {
    var headings = Array.prototype.filter.call(
      content.querySelectorAll('h2, h3, h4, h5'),
      function (heading) { return heading.textContent.trim().length > 0; }
    );

    if (headings.length < 2) {
      return;
    }

    addStableIds(headings);
    addSectionNumbers(headings, content.closest('.post'));
    var container = panel.querySelector('[data-toc-list]');
    var rootList = document.createElement('ul');
    var stack = [{ level: 2, list: rootList, lastItem: null }];

    headings.forEach(function (heading) {
      var level = Number(heading.tagName.slice(1));
      var current = stack[stack.length - 1];

      if (level > current.level && current.lastItem) {
        var nestedList = document.createElement('ul');
        current.lastItem.appendChild(nestedList);
        stack.push({ level: level, list: nestedList, lastItem: null });
      } else {
        while (stack.length > 1 && level < stack[stack.length - 1].level) {
          stack.pop();
        }
      }

      current = stack[stack.length - 1];
      var item = document.createElement('li');
      item.className = 'toc__item toc__item--level-' + level;
      var link = document.createElement('a');
      link.href = '#' + encodeURIComponent(heading.id);
      if (heading.dataset.sectionNumber) {
        var number = document.createElement('span');
        number.className = 'toc__section-number';
        number.setAttribute('aria-hidden', 'true');
        number.textContent = heading.dataset.sectionNumber;
        link.appendChild(number);
      }
      link.appendChild(document.createTextNode(heading.dataset.tocText || heading.textContent.trim()));
      item.appendChild(link);
      current.list.appendChild(item);
      current.lastItem = item;
    });

    container.appendChild(rootList);
    panel.hidden = false;
  }

  function initialise() {
    document.querySelectorAll('.post').forEach(function (post) {
      var content = post.querySelector('[data-post-content]');
      var panel = post.querySelector('[data-post-toc]');
      if (content && panel) {
        buildToc(content, panel);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise);
  } else {
    initialise();
  }
}());
