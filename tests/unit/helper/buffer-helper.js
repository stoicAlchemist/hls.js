const assert = require("assert");
import BufferHelper from '../../../src/helper/buffer-helper';

function createMockBuffer(buffered) {
  return {
    start: i => (buffered.length > i) ? buffered[i].startPTS : null,
    end: i => (buffered.length > i) ? buffered[i].endPTS : null,
    length: buffered.length,
  };
}

describe('BufferHelper', function() {
  describe('filterLivingFragments', function() {
    it("should return empty array if the media is invalid", () => {
      const invalidMedia = {
        get buffered() {
          throw new Error("InvalidStateError");
        }
      };
      const fragments = [
        {
          startPTS: 0,
          endPTS: 0.5
        },
        {
          startPTS: 1,
          endPTS: 2.0
        }
      ];
      const filteredFragments = BufferHelper.filterLivingFragments(fragments, invalidMedia);
      assert.equal(filteredFragments.length, 0);
    });
    it("should return fragments that are not evicted", () => {
      // |__________|//////////|//////////|__________|
      // 0         1.0        2.0        3.0        4.0
      const media = {
        get buffered() {
          return createMockBuffer([
            {
              startPTS: 1,
              endPTS: 2.0
            },
            {
              startPTS: 2.0,
              endPTS: 3.0
            }
          ]);
        }
      };
      // |////|/////|//////////|//////////|//////////|
      // 0         1.0        2.0        3.0        4.0
      const fragments = [
        // ↓ out of buffer ↓
        {
          startPTS: 0,
          endPTS: 0.5
        },
        {
          startPTS: 0.5,
          endPTS: 1.0
        },
        // ↑ out of buffer ↑
        {
          startPTS: 1.0,
          endPTS: 2.0
        },
        {
          startPTS: 2.0,
          endPTS: 3.0
        },
        // ↓ out of buffer ↓
        {
          startPTS: 3.0,
          endPTS: 4.0
        }
      ];
      const filteredFragments = BufferHelper.filterLivingFragments(fragments, media);
      assert.deepEqual(filteredFragments, [fragments[2], fragments[3]]);
    });
  });
  describe('filterFragByMedia', function() {
    const media = {
      get buffered() {
        return createMockBuffer([
          {
            startPTS: 0,
            endPTS: 0.5
          },
          {
            startPTS: 1,
            endPTS: 2.0
          },
        ]);
      }
    };

    it('should return true if media.buffered throw error', function() {
      const invalidMedia = {
        get buffered() {
          throw new Error("InvalidStateError");
        }
      };
      assert.equal(BufferHelper.filterLivingFragments(invalidMedia, 0), false);
    });
    it('should return true if some media.buffered includes the position', function() {
      assert.equal(BufferHelper.isBuffered(media, 0), true);
      assert.equal(BufferHelper.isBuffered(media, 0.1), true);
      assert.equal(BufferHelper.isBuffered(media, 0.5), true);
      assert.equal(BufferHelper.isBuffered(media, 1), true);
      assert.equal(BufferHelper.isBuffered(media, 2), true);
    });
    it('should return false if any media.buffered does not includes the position', function() {
      assert.equal(BufferHelper.isBuffered(media, -0.1), false);
      assert.equal(BufferHelper.isBuffered(media, 0.51), false);
      assert.equal(BufferHelper.isBuffered(media, 0.9), false);
      assert.equal(BufferHelper.isBuffered(media, 2.1), false);
    });
  });
  describe('isBuffered', function() {
    // |////////|__________|////////////////|
    // 0       0.5         1               2.0
    const media = {
      get buffered() {
        return createMockBuffer([
          {
            startPTS: 0,
            endPTS: 0.5
          },
          {
            startPTS: 1,
            endPTS: 2.0
          },
        ]);
      }
    };

    it('should return true if media.buffered throw error', function() {
      const invalidMedia = {
        get buffered() {
          throw new Error("InvalidStateError");
        }
      };
      assert.equal(BufferHelper.isBuffered(invalidMedia, 0), false);
    });
    it('should return true if some media.buffered includes the position', function() {
      assert.equal(BufferHelper.isBuffered(media, 0), true);
      assert.equal(BufferHelper.isBuffered(media, 0.1), true);
      assert.equal(BufferHelper.isBuffered(media, 0.5), true);
      assert.equal(BufferHelper.isBuffered(media, 1), true);
      assert.equal(BufferHelper.isBuffered(media, 2), true);
    });
    it('should return false if any media.buffered does not includes the position', function() {
      assert.equal(BufferHelper.isBuffered(media, -0.1), false);
      assert.equal(BufferHelper.isBuffered(media, 0.51), false);
      assert.equal(BufferHelper.isBuffered(media, 0.9), false);
      assert.equal(BufferHelper.isBuffered(media, 2.1), false);
    });
  });
  describe("bufferInfo", () => {
    it("should return found buffer info when maxHoleDuration is 0", function() {
      // |////////|__________|////////////////|
      // 0       0.5         1               2.0
      const media = {
        get buffered() {
          return createMockBuffer([
            {
              startPTS: 0,
              endPTS: 0.5
            },
            {
              startPTS: 1,
              endPTS: 2.0
            },
          ]);
        }
      };
      const maxHoleDuration = 0;
      assert.deepEqual(BufferHelper.bufferInfo(media, 0, maxHoleDuration), {
        len: 0.5,
        start: 0,
        end: 0.5,
        nextStart: 1
      });
      assert.deepEqual(BufferHelper.bufferInfo(media, 0.5, maxHoleDuration), {
        len: 0,
        start: 0.5,
        end: 0.5,
        nextStart: 1
      });
      assert.deepEqual(BufferHelper.bufferInfo(media, 1, maxHoleDuration), {
        len: 1,
        start: 1,
        end: 2,
        nextStart: undefined
      });
      assert.deepEqual(BufferHelper.bufferInfo(media, 2, maxHoleDuration), {
        len: 0,
        start: 2,
        end: 2,
        nextStart: undefined
      });
    });
    it("should return found buffer info when maxHoleDuration is 0.5", function() {
      // |////////|__________|////////////////|
      // 0       0.5         1               2.0
      const media = {
        get buffered() {
          return createMockBuffer([
            {
              startPTS: 0,
              endPTS: 0.5
            },
            {
              startPTS: 1,
              endPTS: 2.0
            },
          ]);
        }
      };
      const maxHoleDuration = 0.5;
      assert.deepEqual(BufferHelper.bufferInfo(media, 0, maxHoleDuration), {
        len: 0.5,
        start: 0,
        end: 0.5,
        nextStart: 1
      });
      // M: maxHoleDuration: 0.5
      // |////////|__________|////////////////|
      // 0     0.5 --- M --- 1               2.0
      assert.deepEqual(BufferHelper.bufferInfo(media, 0.5, maxHoleDuration), {
        len: 1.5,
        start: 1,
        end: 2,
        nextStart: undefined
      });
      assert.deepEqual(BufferHelper.bufferInfo(media, 1, maxHoleDuration), {
        len: 1,
        start: 1,
        end: 2,
        nextStart: undefined
      });
      assert.deepEqual(BufferHelper.bufferInfo(media, 2, maxHoleDuration), {
        len: 0,
        start: 2,
        end: 2,
        nextStart: undefined
      });
    });
  });
});
