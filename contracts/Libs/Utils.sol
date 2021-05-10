pragma solidity >=0.4.22 <0.8.0;

library Utils {
    function CompactArrayOfUint(uint[] memory original, uint newSize) internal pure returns(uint[] memory) {
        // copy results in a compacted array before returns
        uint[] memory compactResults = new uint[](newSize);
        for (uint j = 0; j < newSize; j++) {
          compactResults[j] = original[j];
        }

        return compactResults;
    }
}
