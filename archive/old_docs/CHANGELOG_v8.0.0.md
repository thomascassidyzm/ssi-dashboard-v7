# v8.0.0 Breaking Changes

**Release Date**: 2025-11-09
**Previous Version**: v7.8.4

---

## Removed Features

### Deprecated Components
- **Course Storage Management page** - Previously deprecated, route and component removed
- **HelloWorld.vue** - Default Vue template component, never used in production
- **CourseStorage.vue** - Unused component after route removal

### Routes Removed
- `/storage` - Course Storage Management (deprecated in v7.8.x)
- LEGO Practice Baskets viewer route (removed in v7.8.x)

---

## Changed Defaults

### Execution Mode
- **Default mode**: Now defaults to **'web'** instead of 'local'
- **Reason**: Web mode provides fully automated browser execution with better reliability
- **Impact**: Users must explicitly select Local Mode if needed

### Git Workflow
- **New capability**: Git push to main from session branches
- **Automation**: Automatic commit and push functionality in web mode
- **Branch management**: Improved session branch handling

---

## New Features

### Web Mode Enhancements
- Fully automated browser execution via Claude Code
- Integrated git operations (commit, push to main)
- Enhanced error handling and recovery
- Real-time progress monitoring

### Version Consolidation
- All version references updated to v8.0.0
- Consistent versioning across:
  - package.json
  - Dashboard UI
  - APML specification
  - API responses
  - Phase brief generators

### Architecture Improvements
- Phase 4 batch preparation
- Dynamic phase tracking
- Immutable contract boundaries
- Consolidated v7.7+ JSON format

---

## Migration Guide

### For Users

#### If using Local Mode
- Local Mode is still available but no longer the default
- **Action**: Explicitly select "Local Mode" in the execution mode selector
- No functionality changes, just requires explicit selection

#### Git Workflow Changes
- **New**: Sessions now support automatic push to main
- **Benefit**: Faster iteration cycles
- **Note**: Manual git operations still supported for advanced users

### For Developers

#### Version References
- All app version references now point to v8.0.0
- **Important**: Data format versions (v7.7.0) remain unchanged
  - `seed_pairs.json` format: v7.7.0 (unchanged)
  - `lego_pairs.json` format: v7.7.0 (unchanged)
  - `lego_baskets.json` format: v7.7.0 (unchanged)

#### Component Updates
- Removed unused `HelloWorld.vue` and `CourseStorage.vue`
- No impact on active components
- LegoBasketViewer still active (used in CourseEditor)

---

## Technical Details

### Files Modified
- `package.json` - Version bump to 8.0.0
- `src/router/index.js` - Dashboard title updated
- `src/views/Dashboard.vue` - Version references updated
- `src/views/CourseGeneration.vue` - Version string updated
- `src/views/APMLSpec.vue` - APML version updated
- `automation_server.cjs` - Phase brief generators updated

### Files Removed
- `src/components/HelloWorld.vue`
- `src/views/CourseStorage.vue`

### Breaking Changes Summary
1. ✅ Execution mode default changed to 'web'
2. ✅ Course Storage route removed
3. ✅ Unused components removed
4. ✅ Version consolidated to v8.0.0

---

## Backward Compatibility

### Data Format
- ✅ **Fully backward compatible** with v7.7.0+ course data
- Existing courses work without modification
- No migration scripts needed

### API Endpoints
- ✅ All existing endpoints functional
- No breaking changes to API contracts
- Phase intelligence endpoints stable

### Configuration
- ✅ Environment variables unchanged
- Dashboard configuration compatible
- VFS structure unchanged

---

## Testing Checklist

- [x] Version displayed correctly in Dashboard
- [x] APML spec shows v8.0.0
- [x] Course generation works (web mode)
- [x] Course browser functional
- [x] Existing courses load correctly
- [x] Phase intelligence accessible
- [x] No broken routes
- [x] No console errors

---

## Next Steps

After v8.0.0 release:

1. ⏳ Complete master prompt refinement
2. ⏳ Create APML SSoT specification document
3. ⏳ PSS (Prompt Switching System) migration
4. ⏳ Enhanced phase intelligence integration

---

## Notes

- **Conservative approach**: Only removed confirmed unused code
- **Documentation**: All docs remain current and accurate
- **No VFS cleanup needed**: Test courses are current
- **Format versions preserved**: v7.7.0 data format unchanged (only app version bumped to v8.0.0)
