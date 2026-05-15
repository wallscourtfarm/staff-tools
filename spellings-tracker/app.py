"""WFA Spellings & Tables Tracker — Streamlit app with ReportLab PDF generation."""

import streamlit as st
import json
from data import default_state, DEFAULT_RULES
from pdf_gen import generate_hl_pdf, generate_tt_pdf, generate_bee_pdf, generate_handout_pdf

st.set_page_config(page_title='WFA Spellings Tracker', page_icon='📚', layout='wide')

# ── Session state init ──
if 'data' not in st.session_state:
    st.session_state.data = default_state()

data = st.session_state.data

# ── Sidebar: data management ──
with st.sidebar:
    st.header('Data')
    uploaded = st.file_uploader('Import JSON', type=['json'])
    if uploaded:
        try:
            loaded = json.load(uploaded)
            st.session_state.data = loaded
            data = st.session_state.data
            st.success('Data imported!')
        except Exception as e:
            st.error(f'Import failed: {e}')

    st.download_button('Download JSON', json.dumps(data, indent=2), 'spellings-data.json', 'application/json')

    if st.button('Reset to defaults'):
        st.session_state.data = default_state()
        data = st.session_state.data
        st.rerun()

# ── Tabs ──
tab_dashboard, tab_hl, tab_tt, tab_bee, tab_handout = st.tabs([
    'Dashboard', 'Home Learning', 'TT Sheets', 'Spelling Bee', 'Handout'
])

# ── Dashboard ──
with tab_dashboard:
    st.header('Pupils')

    # Simple table editing
    if data['pupils']:
        for i, p in enumerate(data['pupils']):
            p.setdefault('ttSet', 'All')
            p.setdefault('pairId', str(i % 15 + 1))
            p.setdefault('tableNum', '')
            p.setdefault('ssUser', '')
            p.setdefault('ssPassword', '')
            p.setdefault('class', 'IM')

            cols = st.columns([2, 2, 1, 1, 1, 1, 0.5])
            with cols[0]:
                p['firstName'] = st.text_input('First', p.get('firstName',''), key=f'fn_{i}', label_visibility='collapsed')
            with cols[1]:
                p['lastName'] = st.text_input('Last', p.get('lastName',''), key=f'ln_{i}', label_visibility='collapsed')
            with cols[2]:
                cls = p.get('class','IM')
                idx = ['IM','WU',''].index(cls) if cls in ['IM','WU',''] else 0
                p['class'] = st.selectbox('Class', ['IM','WU',''], index=idx, key=f'cl_{i}', label_visibility='collapsed')
            with cols[3]:
                p['ttSet'] = st.text_input('TT', p.get('ttSet','All'), key=f'tt_{i}', label_visibility='collapsed')
            with cols[4]:
                p['pairId'] = st.text_input('Pair', p.get('pairId',str(i%15+1)), key=f'pr_{i}', label_visibility='collapsed')
            with cols[5]:
                p['tableNum'] = st.text_input('Table', p.get('tableNum',''), key=f'tb_{i}', label_visibility='collapsed')
            with cols[6]:
                if st.button('🗑', key=f'del_{i}'):
                    data['pupils'].pop(i)
                    st.rerun()
    else:
        st.info('No pupils yet. Add pupils below or import JSON data.')

    st.divider()
    st.subheader('Add pupil')
    add_cols = st.columns([2, 2, 1])
    with add_cols[0]:
        new_fn = st.text_input('First name', key='new_fn')
    with add_cols[1]:
        new_ln = st.text_input('Last name', key='new_ln')
    with add_cols[2]:
        if st.button('Add'):
            if new_fn:
                data['pupils'].append({
                    'id': f'p{len(data["pupils"])+1}',
                    'firstName': new_fn, 'lastName': new_ln,
                    'class': 'IM', 'pairId': str(len(data['pupils'])%15+1),
                    'tableNum': '', 'ttSet': 'All', 'ssUser': '', 'ssPassword': ''
                })
                st.rerun()

    # Week/rule config
    st.divider()
    st.header('Current Week')
    rule_map = {r['id']: r for r in data['rules']}
    rule_options = [(r['id'], f"{r['year']} Step {r['step']}: {r['title'][:60]}") for r in data['rules']]
    selected_rule = st.selectbox('Spelling rule', options=[r[0] for r in rule_options],
        format_func=lambda x: next((r[1] for r in rule_options if r[0]==x), x))

    if selected_rule:
        data['currentWeek'] = selected_rule
        rule = rule_map.get(selected_rule)
        if rule:
            st.markdown(f"**{rule['title']}**")
            st.caption(rule.get('explanation',''))
            st.write('Words: ' + ', '.join(rule.get('words',[])))

# ── Home Learning ──
with tab_hl:
    st.header('Home Learning')
    hl = data.setdefault('hlContent', {'maths':'','reading':'','mathsAdapted':'','readingAdapted':'','label':''})

    col_m, col_r = st.columns(2)
    with col_m:
        hl['maths'] = st.text_area('Maths (standard)', hl.get('maths',''), height=150)
        hl['mathsAdapted'] = st.text_area('Maths (adapted)', hl.get('mathsAdapted',''), height=150)
    with col_r:
        hl['reading'] = st.text_area('Reading (standard)', hl.get('reading',''), height=150)
        hl['readingAdapted'] = st.text_area('Reading (adapted)', hl.get('readingAdapted',''), height=150)

    hl['label'] = st.text_input('Week label', hl.get('label',''))
    hl_class = st.selectbox('Filter by class', ['All', 'IM', 'WU'], key='hl_filter')

    if st.button('Generate Home Learning PDF', type='primary', key='hl_gen'):
        pupils = data['pupils'] if hl_class == 'All' else [p for p in data['pupils'] if p.get('class') == hl_class]
        if pupils:
            try:
                pdf_buf = generate_hl_pdf(
                    pupils, data['rules'], data.get('weeks',[]),
                    data.get('currentWeek'), hl,
                    data.get('adaptedPupils',[])
                )
                st.session_state['hl_pdf'] = pdf_buf.getvalue()
            except Exception as e:
                st.error(f'Error: {e}')
        else:
            st.warning('No pupils found for this filter.')

    if 'hl_pdf' in st.session_state:
        st.download_button('Download HL PDF', st.session_state['hl_pdf'], 'home-learning.pdf', 'application/pdf')

# ── TT Sheets ──
with tab_tt:
    st.header('Times Table Sheets')
    tt_class = st.selectbox('Filter by class', ['All', 'IM', 'WU'], key='tt_filter')

    if st.button('Generate TT Sheets PDF', type='primary', key='tt_gen'):
        pupils = data['pupils'] if tt_class == 'All' else [p for p in data['pupils'] if p.get('class') == tt_class]
        if pupils:
            try:
                pdf_buf = generate_tt_pdf(pupils)
                st.session_state['tt_pdf'] = pdf_buf.getvalue()
            except Exception as e:
                st.error(f'Error: {e}')
        else:
            st.warning('No pupils found for this filter.')

    if 'tt_pdf' in st.session_state:
        st.download_button('Download TT PDF', st.session_state['tt_pdf'], 'tt-sheets.pdf', 'application/pdf')

# ── Spelling Bee ──
with tab_bee:
    st.header('Spelling Bee Sheets')
    col1, col2 = st.columns(2)
    with col1:
        bee_class = st.selectbox('Filter by class', ['All', 'IM', 'WU'], key='bee_filter')
        sort_by = st.selectbox('Sort by', ['name', 'pair'], key='bee_sort')
    with col2:
        include_writing = st.checkbox('Include writing sheets', value=True, key='bee_writing')

    if st.button('Generate Bee Sheets PDF', type='primary', key='bee_gen'):
        pupils = data['pupils'] if bee_class == 'All' else [p for p in data['pupils'] if p.get('class') == bee_class]
        if pupils:
            try:
                pdf_buf = generate_bee_pdf(
                    pupils, data['rules'], data.get('weeks',[]),
                    data.get('currentWeek'), include_writing, sort_by
                )
                st.session_state['bee_pdf'] = pdf_buf.getvalue()
            except Exception as e:
                st.error(f'Error: {e}')
        else:
            st.warning('No pupils found for this filter.')

    if 'bee_pdf' in st.session_state:
        st.download_button('Download Bee PDF', st.session_state['bee_pdf'], 'spelling-lists.pdf', 'application/pdf')

# ── Handout ──
with tab_handout:
    st.header('Hand-Out Order')

    if st.button('Generate Handout PDF', type='primary', key='ho_gen'):
        if data['pupils']:
            try:
                pdf_buf = generate_handout_pdf(data['pupils'])
                st.session_state['ho_pdf'] = pdf_buf.getvalue()
            except Exception as e:
                st.error(f'Error: {e}')
        else:
            st.warning('No pupils added yet.')

    if 'ho_pdf' in st.session_state:
        st.download_button('Download Handout PDF', st.session_state['ho_pdf'], 'handout-order.pdf', 'application/pdf')