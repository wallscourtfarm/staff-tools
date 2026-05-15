"""WFA Spellings & Tables Tracker — Streamlit app with ReportLab PDF generation."""

import streamlit as st
import json
import pandas as pd
from data import default_state, DEFAULT_RULES
from pdf_gen import generate_hl_pdf, generate_tt_pdf, generate_bee_pdf, generate_handout_pdf

st.set_page_config(page_title='WFA Spellings & Tables Tracker', page_icon='📚', layout='wide')

# ── Custom CSS ──
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

    .main {
        font-family: 'Nunito', sans-serif;
    }

    h1, h2, h3, h4 {
        font-family: 'Nunito', sans-serif !important;
        font-weight: 700 !important;
    }

    .block-container {
        padding-top: 2rem !important;
        padding-bottom: 2rem !important;
    }

    .stButton>button {
        background-color: #1798d3 !important;
        color: white !important;
        border: none !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        padding: 0.5rem 1.5rem !important;
        transition: all 0.2s !important;
    }

    .stButton>button:hover {
        background-color: #0d7bb8 !important;
        box-shadow: 0 4px 12px rgba(23, 152, 211, 0.3) !important;
    }

    .stButton>button[kind="secondary"] {
        background-color: #f0f0f0 !important;
        color: #333 !important;
        border: 1px solid #ddd !important;
    }

    .stButton>button[kind="secondary"]:hover {
        background-color: #e0e0e0 !important;
        box-shadow: none !important;
    }

    .metric-card {
        background: linear-gradient(135deg, #1798d3 0%, #0d7bb8 100%);
        color: white;
        padding: 1.5rem;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(23, 152, 211, 0.2);
    }

    .metric-card h2 {
        color: white !important;
        margin: 0 !important;
        font-size: 2.5rem !important;
        font-weight: 800 !important;
    }

    .metric-card p {
        margin: 0.5rem 0 0 0 !important;
        font-size: 1rem !important;
        opacity: 0.9;
    }

    .info-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .pupil-table th {
        background-color: #1798d3 !important;
        color: white !important;
        font-weight: 600 !important;
    }

    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        border-bottom: 2px solid #e5e7eb;
    }

    .stTabs [data-baseweb="tab"] {
        border-radius: 8px 8px 0 0 !important;
        padding: 0.75rem 1.5rem !important;
        font-weight: 600 !important;
    }

    .stTabs [aria-selected="true"] {
        background-color: #1798d3 !important;
        color: white !important;
    }

    .download-btn {
        background-color: #10b981 !important;
        color: white !important;
    }

    .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
    }

    .status-active {
        background-color: #d1fae5;
        color: #065f46;
    }

    .status-inactive {
        background-color: #fee2e2;
        color: #991b1b;
    }
</style>
""", unsafe_allow_html=True)

# ── Session state init ──
def init_session():
    if 'data' not in st.session_state:
        st.session_state.data = default_state()
    if 'editing_pupil' not in st.session_state:
        st.session_state.editing_pupil = None
    if 'show_add_pupil' not in st.session_state:
        st.session_state.show_add_pupil = False

init_session()
data = st.session_state.data

# ── Header ──
col1, col2 = st.columns([4, 1])
with col1:
    st.title('WFA Spellings & Tables Tracker')
    st.markdown('Year 4 Home Learning & Assessment Generator')
with col2:
    st.markdown(f"""
    <div style="text-align: right; padding-top: 1rem;">
        <span style="color: #1798d3; font-weight: 800; font-size: 1.5rem;">v1.0</span><br>
        <span style="color: #6b7280; font-size: 0.85rem;">Wallscourt Farm Academy</span>
    </div>
    """, unsafe_allow_html=True)

st.divider()

# ── Sidebar ──
with st.sidebar:
    st.image('https://wallscourtfarm.github.io/staff-tools/logo.png', width=150)
    st.markdown('### Wallscourt Farm Academy')
    st.markdown('<span style="color: #6b7280; font-size: 0.85rem;">Cabot Learning Federation</span>', unsafe_allow_html=True)

    st.divider()

    st.header('Data Management')

    uploaded = st.file_uploader('Import JSON', type=['json'])
    if uploaded:
        try:
            loaded = json.load(uploaded)
            st.session_state.data = loaded
            data = st.session_state.data
            st.success('Data imported successfully!')
            st.rerun()
        except Exception as e:
            st.error(f'Import failed: {e}')

    st.download_button(
        'Export JSON Backup',
        json.dumps(data, indent=2),
        'wfa-spellings-backup.json',
        'application/json',
        use_container_width=True
    )

    if st.button('Reset to Defaults', use_container_width=True):
        st.session_state.data = default_state()
        data = st.session_state.data
        st.rerun()

    st.divider()

    # Quick Stats
    st.header('Quick Stats')
    total_pupils = len(data['pupils'])
    im_count = sum(1 for p in data['pupils'] if p.get('class') == 'IM')
    wu_count = sum(1 for p in data['pupils'] if p.get('class') == 'WU')

    col_s1, col_s2 = st.columns(2)
    with col_s1:
        st.metric('Total Pupils', total_pupils)
    with col_s2:
        st.metric('Current Week', 'Set' if data.get('currentWeek') else 'None')

    col_s3, col_s4 = st.columns(2)
    with col_s3:
        st.metric('IM Class', im_count)
    with col_s4:
        st.metric('WU Class', wu_count)

# ── Main Tabs ──
tab_dashboard, tab_weekly, tab_hl, tab_tt, tab_bee, tab_handout = st.tabs([
    '📊 Dashboard',
    '📅 Weekly Setup',
    '🏠 Home Learning',
    '🔢 TT Sheets',
    '🐝 Spelling Bee',
    '📋 Handout'
])

# ── Dashboard ──
with tab_dashboard:
    st.header('Pupil Management')

    # Stats Row
    col_stat1, col_stat2, col_stat3, col_stat4 = st.columns(4)
    with col_stat1:
        st.markdown(f"""
        <div class="metric-card">
            <h2>{total_pupils}</h2>
            <p>Total Pupils</p>
        </div>
        """, unsafe_allow_html=True)
    with col_stat2:
        st.markdown(f"""
        <div class="metric-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <h2>{im_count}</h2>
            <p>IM Class</p>
        </div>
        """, unsafe_allow_html=True)
    with col_stat3:
        st.markdown(f"""
        <div class="metric-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
            <h2>{wu_count}</h2>
            <p>WU Class</p>
        </div>
        """, unsafe_allow_html=True)
    with col_stat4:
        week_status = 'Active' if data.get('currentWeek') else 'Not Set'
        week_color = 'status-active' if data.get('currentWeek') else 'status-inactive'
        st.markdown(f"""
        <div class="metric-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
            <h2>{len(data.get('weeks', []))}</h2>
            <p>Weeks Set Up</p>
        </div>
        """, unsafe_allow_html=True)

    st.markdown('<div style="height: 1.5rem;"></div>', unsafe_allow_html=True)

    # Pupil Table
    if data['pupils']:
        st.subheader('Pupil List')

        # Create DataFrame for display
        pupil_df = []
        for p in data['pupils']:
            pupil_df.append({
                'First': p.get('firstName', ''),
                'Last': p.get('lastName', ''),
                'Class': p.get('class', 'IM'),
                'Pair': p.get('pairId', ''),
                'Table': p.get('tableNum', ''),
                'TT Set': p.get('ttSet', 'All'),
                'Shed User': p.get('ssUser', ''),
                'Shed Pass': p.get('ssPassword', ''),
                'Adapted': 'Yes' if p.get('id') in data.get('adaptedPupils', []) else 'No'
            })

        df = pd.DataFrame(pupil_df)

        # Filter
        filter_class = st.selectbox('Filter by class', ['All', 'IM', 'WU'], key='dash_filter')
        if filter_class != 'All':
            df = df[df['Class'] == filter_class]

        st.dataframe(df, use_container_width=True, hide_index=True)

        # Edit/Delete section
        st.subheader('Edit Pupil')
        pupil_names = [f"{p['firstName']} {p['lastName']} ({p.get('class', 'IM')})" for p in data['pupils']]
        pupil_ids = [p['id'] for p in data['pupils']]

        if pupil_names:
            selected_idx = st.selectbox('Select pupil to edit', range(len(pupil_names)),
                                       format_func=lambda i: pupil_names[i])
            selected_pupil = data['pupils'][selected_idx]

            col_e1, col_e2, col_e3, col_e4 = st.columns(4)
            with col_e1:
                new_first = st.text_input('First Name', selected_pupil.get('firstName', ''), key='edit_first')
            with col_e2:
                new_last = st.text_input('Last Name', selected_pupil.get('lastName', ''), key='edit_last')
            with col_e3:
                new_class = st.selectbox('Class', ['IM', 'WU'],
                                        index=['IM', 'WU'].index(selected_pupil.get('class', 'IM')),
                                        key='edit_class')
            with col_e4:
                new_pair = st.text_input('Pair ID', selected_pupil.get('pairId', ''), key='edit_pair')

            col_e5, col_e6, col_e7, col_e8 = st.columns(4)
            with col_e5:
                new_table = st.text_input('Table #', selected_pupil.get('tableNum', ''), key='edit_table')
            with col_e6:
                new_tt = st.selectbox('TT Set',
                                     ['All', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
                                     index=['All', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].index(selected_pupil.get('ttSet', 'All')),
                                     key='edit_tt')
            with col_e7:
                new_ssu = st.text_input('Shed User', selected_pupil.get('ssUser', ''), key='edit_ssu')
            with col_e8:
                new_ssp = st.text_input('Shed Pass', selected_pupil.get('ssPassword', ''), key='edit_ssp')

            col_btn1, col_btn2, col_btn3 = st.columns(3)
            with col_btn1:
                if st.button('Save Changes', use_container_width=True):
                    selected_pupil['firstName'] = new_first
                    selected_pupil['lastName'] = new_last
                    selected_pupil['class'] = new_class
                    selected_pupil['pairId'] = new_pair
                    selected_pupil['tableNum'] = new_table
                    selected_pupil['ttSet'] = new_tt
                    selected_pupil['ssUser'] = new_ssu
                    selected_pupil['ssPassword'] = new_ssp
                    st.success('Pupil updated!')
                    st.rerun()

            with col_btn2:
                is_adapted = selected_pupil['id'] in data.get('adaptedPupils', [])
                if st.button('Toggle Adapted' + (' (Currently: Yes)' if is_adapted else ' (Currently: No)'),
                           use_container_width=True):
                    if is_adapted:
                        data['adaptedPupils'] = [pid for pid in data['adaptedPupils'] if pid != selected_pupil['id']]
                    else:
                        data['adaptedPupils'] = data.get('adaptedPupils', []) + [selected_pupil['id']]
                    st.rerun()

            with col_btn3:
                if st.button('Delete Pupil', type='secondary', use_container_width=True):
                    data['pupils'].pop(selected_idx)
                    st.rerun()

    else:
        st.info('No pupils added yet. Use the form below to add pupils.')

    # Add New Pupil
    st.subheader('Add New Pupil')
    col_a1, col_a2, col_a3 = st.columns(3)
    with col_a1:
        add_first = st.text_input('First Name', key='add_first')
    with col_a2:
        add_last = st.text_input('Last Name', key='add_last')
    with col_a3:
        add_class = st.selectbox('Class', ['IM', 'WU'], key='add_class')

    if st.button('Add Pupil', use_container_width=True):
        if add_first:
            data['pupils'].append({
                'id': f'p{len(data["pupils"])+1}',
                'firstName': add_first,
                'lastName': add_last,
                'class': add_class,
                'pairId': str(len(data['pupils']) % 15 + 1),
                'tableNum': '',
                'ttSet': 'All',
                'ssUser': '',
                'ssPassword': ''
            })
            st.success(f'Added {add_first} {add_last}!')
            st.rerun()
        else:
            st.error('First name is required.')

# ── Weekly Setup ──
with tab_weekly:
    st.header('Weekly Setup')

    # Current week info
    if data.get('currentWeek'):
        current_rule = None
        for r in data['rules']:
            if r['id'] == data['currentWeek']:
                current_rule = r
                break

        if current_rule:
            st.markdown(f"""
            <div class="info-card" style="border-left: 4px solid #1798d3;">
                <h4 style="margin-top: 0;">Current Week</h4>
                <p><strong>{current_rule['title']}</strong></p>
                <p style="color: #6b7280;">{current_rule.get('explanation', '')}</p>
                <p><strong>Words:</strong> {', '.join(current_rule.get('words', []))}</p>
            </div>
            """, unsafe_allow_html=True)

    st.subheader('Set New Week')

    # Organize rules by year
    years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 4 Rev', 'Year 5', 'Year 6']

    week_label = st.text_input('Week Label (e.g., Term 5 Week 4)',
                               value=data.get('weeks', [{}])[-1].get('label', '') if data.get('weeks') else '')

    col_w1, col_w2 = st.columns(2)
    with col_w1:
        selected_year = st.selectbox('Year Group', years)
        year_rules = [r for r in data['rules'] if r['year'] == selected_year]

        if year_rules:
            rule_options = [(r['id'], f"Step {r['step']}: {r['title']}") for r in year_rules]
            selected_rule_id = st.selectbox('Select Rule',
                                           [r[0] for r in rule_options],
                                           format_func=lambda x: next((r[1] for r in rule_options if r[0]==x), x))
        else:
            selected_rule_id = None
            st.info('No rules for this year group.')

    with col_w2:
        st.markdown('### Preview')
        if selected_rule_id:
            preview_rule = next((r for r in data['rules'] if r['id'] == selected_rule_id), None)
            if preview_rule:
                st.markdown(f"**{preview_rule['title']}**")
                st.caption(preview_rule.get('explanation', ''))
                st.write('Words: ' + ', '.join(preview_rule.get('words', [])))

    if st.button('Save Week Setup', use_container_width=True):
        if selected_rule_id and week_label:
            week = {
                'id': f'w{len(data["weeks"])+1}',
                'label': week_label,
                'ruleId': selected_rule_id,
                'date': pd.Timestamp.now().strftime('%Y-%m-%d')
            }
            data['weeks'].append(week)
            data['currentWeek'] = selected_rule_id
            st.success(f'Week saved: {week_label}')
            st.rerun()
        else:
            st.error('Please enter a week label and select a rule.')

    # Week history
    if data.get('weeks'):
        st.subheader('Week History')
        week_df = []
        for w in data['weeks']:
            rule = next((r for r in data['rules'] if r['id'] == w.get('ruleId')), None)
            week_df.append({
                'Label': w.get('label', ''),
                'Rule': rule['title'] if rule else 'Unknown',
                'Date': w.get('date', '')
            })
        st.dataframe(pd.DataFrame(week_df), use_container_width=True, hide_index=True)

# ── Home Learning ──
with tab_hl:
    st.header('Home Learning Generator')

    hl = data.setdefault('hlContent', {'maths':'','reading':'','mathsAdapted':'','readingAdapted':'','label':''})

    st.subheader('Week Content')
    week_label = st.text_input('Week Label', hl.get('label', ''), key='hl_label')
    hl['label'] = week_label

    col_hl1, col_hl2 = st.columns(2)
    with col_hl1:
        st.markdown('**Standard**')
        hl['maths'] = st.text_area('Maths Content', hl.get('maths',''), height=120, key='hl_maths')
        hl['reading'] = st.text_area('Reading Content', hl.get('reading',''), height=120, key='hl_reading')
    with col_hl2:
        st.markdown('**Adapted**')
        hl['mathsAdapted'] = st.text_area('Maths (Adapted)', hl.get('mathsAdapted',''), height=120, key='hl_maths_a')
        hl['readingAdapted'] = st.text_area('Reading (Adapted)', hl.get('readingAdapted',''), height=120, key='hl_reading_a')

    st.subheader('Generate PDF')
    col_hl3, col_hl4 = st.columns(2)
    with col_hl3:
        hl_class = st.selectbox('Filter by class', ['All', 'IM', 'WU'], key='hl_filter')
    with col_hl4:
        st.markdown('<div style="height: 1.8rem;"></div>', unsafe_allow_html=True)
        if st.button('Generate Home Learning PDF', type='primary', use_container_width=True):
            pupils = data['pupils'] if hl_class == 'All' else [p for p in data['pupils'] if p.get('class') == hl_class]
            if pupils and data.get('currentWeek'):
                try:
                    with st.spinner('Generating PDF...'):
                        pdf_buf = generate_hl_pdf(
                            pupils, data['rules'], data.get('weeks', []),
                            data.get('currentWeek'), hl,
                            data.get('adaptedPupils', [])
                        )
                        st.session_state['hl_pdf'] = pdf_buf.getvalue()
                    st.success('PDF generated! Click download below.')
                except Exception as e:
                    st.error(f'Error: {e}')
            else:
                if not pupils:
                    st.warning('No pupils found for this filter.')
                if not data.get('currentWeek'):
                    st.warning('No week set. Go to Weekly Setup first.')

    if 'hl_pdf' in st.session_state:
        st.download_button(
            'Download Home Learning PDF',
            st.session_state['hl_pdf'],
            f'home-learning-{week_label or "week"}.pdf',
            'application/pdf',
            use_container_width=True
        )

# ── TT Sheets ──
with tab_tt:
    st.header('Times Table Sheets')

    st.markdown('Generate landscape sheets with 40 questions per pupil (2 pupils per page).')

    col_tt1, col_tt2 = st.columns(2)
    with col_tt1:
        tt_class = st.selectbox('Filter by class', ['All', 'IM', 'WU'], key='tt_filter')
    with col_tt2:
        st.markdown('<div style="height: 1.8rem;"></div>', unsafe_allow_html=True)
        if st.button('Generate TT Sheets PDF', type='primary', use_container_width=True):
            pupils = data['pupils'] if tt_class == 'All' else [p for p in data['pupils'] if p.get('class') == tt_class]
            if pupils:
                try:
                    with st.spinner('Generating PDF...'):
                        pdf_buf = generate_tt_pdf(pupils)
                        st.session_state['tt_pdf'] = pdf_buf.getvalue()
                    st.success('PDF generated! Click download below.')
                except Exception as e:
                    st.error(f'Error: {e}')
            else:
                st.warning('No pupils found for this filter.')

    if 'tt_pdf' in st.session_state:
        st.download_button(
            'Download TT Sheets PDF',
            st.session_state['tt_pdf'],
            'tt-sheets.pdf',
            'application/pdf',
            use_container_width=True
        )

# ── Spelling Bee ──
with tab_bee:
    st.header('Spelling Bee Sheets')

    st.markdown('Generate reader sheets (words visible) and writing sheets (blank lines). Pairs are colour-coded.')

    col_bee1, col_bee2, col_bee3 = st.columns(3)
    with col_bee1:
        bee_class = st.selectbox('Filter by class', ['All', 'IM', 'WU'], key='bee_filter')
    with col_bee2:
        bee_sort = st.selectbox('Sort by', ['name', 'pair'], key='bee_sort')
    with col_bee3:
        bee_writing = st.checkbox('Include writing sheets', value=True, key='bee_writing')

    if st.button('Generate Spelling Bee PDF', type='primary', use_container_width=True):
        pupils = data['pupils'] if bee_class == 'All' else [p for p in data['pupils'] if p.get('class') == bee_class]
        if pupils and data.get('currentWeek'):
            try:
                with st.spinner('Generating PDF...'):
                    pdf_buf = generate_bee_pdf(
                        pupils, data['rules'], data.get('weeks', []),
                        data.get('currentWeek'), bee_writing, bee_sort
                    )
                    st.session_state['bee_pdf'] = pdf_buf.getvalue()
                st.success('PDF generated! Click download below.')
            except Exception as e:
                st.error(f'Error: {e}')
        else:
            if not pupils:
                st.warning('No pupils found for this filter.')
            if not data.get('currentWeek'):
                st.warning('No week set. Go to Weekly Setup first.')

    if 'bee_pdf' in st.session_state:
        st.download_button(
            'Download Spelling Bee PDF',
            st.session_state['bee_pdf'],
            'spelling-lists.pdf',
            'application/pdf',
            use_container_width=True
        )

# ── Handout ──
with tab_handout:
    st.header('Hand-Out Order')

    st.markdown('Generate a sorted list by table number with pair colour indicators.')

    if st.button('Generate Handout PDF', type='primary', use_container_width=True):
        if data['pupils']:
            try:
                with st.spinner('Generating PDF...'):
                    pdf_buf = generate_handout_pdf(data['pupils'])
                    st.session_state['ho_pdf'] = pdf_buf.getvalue()
                st.success('PDF generated! Click download below.')
            except Exception as e:
                st.error(f'Error: {e}')
        else:
            st.warning('No pupils added yet.')

    if 'ho_pdf' in st.session_state:
        st.download_button(
            'Download Handout PDF',
            st.session_state['ho_pdf'],
            'handout-order.pdf',
            'application/pdf',
            use_container_width=True
        )
