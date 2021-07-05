(function () {
    'use strict';

    // URLSearchParameters
    window.URLSearchParameters = function (querystring) {
        return (querystring || location.search).split('?').pop().split('&').reduce(function (acc, keyval) {
            var parts = keyval.split('=');
            var key = decodeURIComponent(parts[0]);
            var val = parts[1] ? decodeURIComponent(parts[1]) : true;
            acc[key] = val;
            return acc;
        }, {});
    };

    // Go to a certain URL, trigger reload if necessary
    window.goto = function (href, newtab) {
        window.open(href, newtab ? '_blank' : '_top');
        if (window.location.pathname === href.split('#')[0]) {
            window.location.reload();
        }
    };

    window.getJSON = async function (url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        else return res.json();
    };

    window.decodeHTMLEntities = function (raw) {
        const txt = document.createElement("textarea");
        txt.innerHTML = raw;
        return txt.textContent;
    };

    window.parseBoolean = function (val) {
        if (!val) return false;

        val = String(val);
        return (!val || val === 'null' || val === 'false' || val === '0');
    };

    window.setIntervalAndExecute = function (func, millis) {
        setInterval(func, millis) && func();
    };

    window.debounce = function (func, wait) {
        let timeout;
        return function () {
            const args = arguments;
            const context = this;
            const later = function () {
                timeout = null;
                func.apply(context, args);
            };
            const callNow = !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    window.throttle = function (func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    HTMLElement.prototype.attach = function (tag, attrs = {}) {
        const elem = document.createElement(tag);
        Object.keys(attrs).forEach(key => elem.setAttribute(key, attrs[key]));
        this.appendChild(elem);
        return elem;
    };

    HTMLElement.prototype.clear = function () {
        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }
        return this;
    };

    DocumentFragment.prototype.attach = function (tag, attrs = {}) {
        return HTMLElement.prototype.attach.call(this, tag, attrs);
    };

    HTMLElement.prototype.siblings = function () {
        return [...this.parentNode.children];
    };

    HTMLElement.prototype.next = function () {
        const siblings = this.siblings();
        const idx = siblings.indexOf(this);
        if (idx < siblings.length - 1) {
            return siblings[idx + 1]
        } else {
            return null;
        }
    };

    HTMLElement.prototype.prev = function () {
        const siblings = this.siblings();
        const idx = siblings.indexOf(this);
        if (idx > 0) {
            return siblings[idx - 1]
        } else {
            return null;
        }
    };

    HTMLElement.prototype.focusAndScroll = function () {
        this.focus();
        this.scrollIntoView();
    };

})();